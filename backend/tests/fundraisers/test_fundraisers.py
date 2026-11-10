from datetime import UTC, datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID
from zoneinfo import ZoneInfo

import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.modules.accounts.enums import AccountType, TransactionType
from app.modules.accounts.models import Account, Transaction
from app.modules.accounts.service import move_money
from app.modules.classrooms.enums import MembershipStatus
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.models import Fundraiser, FundraiserObligation, FundraiserPayment
from app.modules.users.models import User
from tests.factories import make_child, make_class, make_membership, make_payment

URL = "/api/fundraisers"
RATE = Decimal("50.25")


@pytest.fixture
def school(db, auth_headers):
    headers = {
        role: auth_headers(f"{role}@example.com")
        for role in ("treasurer", "parent", "other_parent")
    }
    users = {user.email.split("@")[0]: user for user in db.scalars(select(User))}
    school_class = make_class(db, users["treasurer"].id)
    own_child = make_child(db, users["parent"].id)
    other_child = make_child(db, users["other_parent"].id, first_name="Jan")
    pending_child = make_child(db, users["parent"].id, first_name="Maja")
    for child in (own_child, other_child):
        make_membership(db, child.id, school_class.id)
    pending = make_membership(db, pending_child.id, school_class.id, MembershipStatus.PENDING)
    db.commit()
    today = datetime.now(ZoneInfo("Europe/Warsaw")).date()
    return SimpleNamespace(
        class_id=school_class.id,
        own_child_id=str(own_child.id),
        other_child_id=str(other_child.id),
        pending_child_id=str(pending_child.id),
        pending_membership_id=pending.id,
        headers=headers,
        user_ids={role: user.id for role, user in users.items()},
        payload={
            "class_id": str(school_class.id),
            "name": "School trip",
            "required_amount_per_child": str(RATE),
            "start_date": str(today - timedelta(days=1)),
            "end_date": str(today + timedelta(days=1)),
        },
        today=today,
    )


@pytest.fixture
def fundraiser_id(client, school):
    response = client.post(URL, headers=school.headers["treasurer"], json=school.payload)
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


def _top_up(client, headers, amount="100.00"):
    response = client.post("/api/accounts/me/top-up", headers=headers, json={"amount": amount})
    assert response.status_code == 200, response.text


def _balance(client, headers) -> Decimal:
    response = client.get("/api/accounts/me", headers=headers)
    assert response.status_code == 200, response.text
    return Decimal(response.json()["balance"])


def test_treasurer_crud_creates_account_and_snapshots_participants(client, db, school):
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]
    forbidden = client.post(URL, headers=parent, json=school.payload)
    assert forbidden.status_code == 404

    response = client.post(URL, headers=treasurer, json=school.payload)
    assert response.status_code == 201, response.text
    created = response.json()
    fundraiser_id = UUID(created["id"])
    account = db.scalar(select(Account).where(Account.fundraiser_id == fundraiser_id))
    assert account.account_type == AccountType.FUNDRAISER
    assert account.user_id is None
    assert account.iban == created["iban"]
    assert account.balance == 0

    url = f"{URL}/{fundraiser_id}"
    assert client.patch(url, headers=parent, json={"name": "Other name"}).status_code == 404
    assert client.delete(url, headers=parent).status_code == 404
    assert client.get(URL, headers=parent, params={"class_id": str(school.class_id)}).json() == [
        created
    ]

    member_url = f"/api/classes/{school.class_id}/members/{school.pending_membership_id}"
    assert client.patch(member_url, headers=treasurer, json={"status": "ACTIVE"}).status_code == 200
    detail = client.get(url, headers=parent).json()
    assert {row["child_id"] for row in detail["children"]} == {
        school.own_child_id,
        school.other_child_id,
        school.pending_child_id,
    }
    assert detail["progress"]["required_total"] == "150.75"

    edit = client.patch(url, headers=treasurer, json={"name": "Museum", "description": "Bus trip"})
    assert edit.status_code == 200, edit.text
    assert edit.json()["name"] == "Museum"
    assert client.delete(url, headers=treasurer).status_code == 204
    assert db.get(Fundraiser, fundraiser_id) is None
    assert db.scalar(select(Account.id).where(Account.fundraiser_id == fundraiser_id)) is None
    assert (
        db.scalar(
            select(FundraiserObligation.id).where(
                FundraiserObligation.fundraiser_id == fundraiser_id
            )
        )
        is None
    )


def test_payment_uses_full_rate_and_updates_history_and_progress(client, db, school, fundraiser_id):
    parent = school.headers["parent"]
    treasurer = school.headers["treasurer"]
    url = f"{URL}/{fundraiser_id}"
    payload = {"child_id": school.other_child_id}
    _top_up(client, parent)

    assert (
        client.post(
            f"{url}/payments", headers=parent, json={**payload, "amount": "1.00"}
        ).status_code
        == 422
    )
    response = client.post(f"{url}/payments", headers=parent, json=payload)
    assert response.status_code == 201, response.text
    payment = response.json()
    assert payment["child_id"] == school.other_child_id
    assert payment["payer_id"] == str(school.user_ids["parent"])
    assert Decimal(payment["amount"]) == RATE
    assert _balance(client, parent) == Decimal("49.75")

    ledger = db.get(Transaction, UUID(payment["transaction_id"]))
    assert ledger.type == TransactionType.FUNDRAISER_PAYMENT
    assert ledger.amount == RATE
    assert ledger.from_account.user_id == school.user_ids["parent"]
    assert ledger.to_account.fundraiser_id == fundraiser_id
    assert ledger.to_account.balance == RATE
    assert client.get(f"{url}/payments", headers=treasurer).json() == [payment]
    detail = client.get(url, headers=parent).json()
    assert detail["progress"]["required_total"] == "100.50"
    assert detail["progress"]["paid_total"] == detail["progress"]["current_balance"] == "50.25"
    children = {row["child_id"]: row for row in detail["children"]}
    assert children[school.other_child_id]["is_paid"] is True
    assert children[school.other_child_id]["remaining_amount"] == "0.00"
    assert children[school.own_child_id]["is_paid"] is False
    assert children[school.own_child_id]["remaining_amount"] == "50.25"

    edit = client.patch(url, headers=treasurer, json={"required_amount_per_child": "51.00"})
    assert edit.status_code == 409
    assert client.delete(url, headers=treasurer).status_code == 409
    assert (
        client.delete(
            f"/api/children/{school.other_child_id}", headers=school.headers["other_parent"]
        ).status_code
        == 409
    )


def test_insufficient_wallet_leaves_balances_and_ledger_intact(client, db, school, fundraiser_id):
    parent = school.headers["parent"]
    _top_up(client, parent, "50.24")
    url = f"{URL}/{fundraiser_id}"
    response = client.post(
        f"{url}/payments", headers=parent, json={"child_id": school.own_child_id}
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Not enough money in your wallet"
    assert _balance(client, parent) == Decimal("50.24")
    assert client.get(url, headers=parent).json()["progress"]["current_balance"] == "0.00"
    assert client.get(f"{url}/payments", headers=parent).json() == []
    assert (
        db.scalar(
            select(func.count(Transaction.id)).where(
                Transaction.type == TransactionType.FUNDRAISER_PAYMENT
            )
        )
        == 0
    )


def test_second_payer_cannot_pay_again_and_database_enforces_it(client, db, school, fundraiser_id):
    parent = school.headers["parent"]
    other_parent = school.headers["other_parent"]
    _top_up(client, parent)
    _top_up(client, other_parent)
    url = f"{URL}/{fundraiser_id}/payments"
    payload = {"child_id": school.own_child_id}
    first = client.post(url, headers=parent, json=payload)
    assert first.status_code == 201, first.text

    second = client.post(url, headers=other_parent, json=payload)
    assert second.status_code == 409
    assert second.json()["detail"] == "Child is already paid"
    assert _balance(client, other_parent) == Decimal("100.00")

    with pytest.raises(IntegrityError), db.begin_nested():
        make_payment(db, db.get(Fundraiser, fundraiser_id), UUID(school.own_child_id))
    assert client.get(url, headers=parent).json() == [first.json()]


def test_full_refund_keeps_history_and_allows_repayment(client, db, school, fundraiser_id):
    parent = school.headers["parent"]
    _top_up(client, parent)
    url = f"{URL}/{fundraiser_id}"
    payload = {"child_id": school.own_child_id}
    response = client.post(f"{url}/payments", headers=parent, json=payload)
    assert response.status_code == 201, response.text

    payment = db.get(FundraiserPayment, UUID(response.json()["id"]))
    original = payment.transaction
    refund = move_money(
        db,
        amount=original.amount,
        type_=TransactionType.PAYMENT_REFUND,
        created_by=db.get(User, school.user_ids["treasurer"]),
        from_account=original.to_account,
        to_account=original.from_account,
    )
    payment.refunded_at = datetime.now(UTC)
    payment.refund_transaction_id = refund.id
    db.commit()

    detail = client.get(url, headers=parent).json()
    assert detail["progress"]["paid_total"] == detail["progress"]["current_balance"] == "0.00"
    assert detail["progress"]["refunded_total"] == "50.25"
    second = client.post(f"{url}/payments", headers=parent, json=payload)
    assert second.status_code == 201, second.text
    history = {row["id"]: row for row in client.get(f"{url}/payments", headers=parent).json()}
    assert history[response.json()["id"]]["refunded_at"] is not None
    assert history[second.json()["id"]]["refunded_at"] is None
    assert len(history) == 2


def test_outsider_cannot_read_or_pay_and_pending_child_is_not_included(
    client, auth_headers, school, fundraiser_id
):
    parent = school.headers["parent"]
    outsider = auth_headers("outsider@example.com")
    url = f"{URL}/{fundraiser_id}"
    assert client.get(url, headers=outsider).status_code == 404
    assert client.get(f"{url}/payments", headers=outsider).status_code == 404
    assert (
        client.post(
            f"{url}/payments", headers=outsider, json={"child_id": school.own_child_id}
        ).status_code
        == 404
    )
    response = client.post(
        f"{url}/payments", headers=parent, json={"child_id": school.pending_child_id}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found"


@pytest.mark.parametrize("state", ["draft", "closed", "blocked", "future", "expired"])
def test_payments_require_an_active_fundraiser_within_dates(
    client, db, school, fundraiser_id, state
):
    fundraiser = db.get(Fundraiser, fundraiser_id)
    if state in {"draft", "closed"}:
        fundraiser.status = FundraiserStatus(state.upper())
    elif state == "blocked":
        fundraiser.is_blocked = True
    else:
        offset = 3 if state == "future" else -3
        fundraiser.start_date = fundraiser.end_date = school.today + timedelta(days=offset)
    db.commit()

    response = client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=school.headers["treasurer"],
        json={"child_id": school.own_child_id},
    )
    assert response.status_code == 409

    expected_detail = {
        "draft": "Fundraiser is not accepting payments",
        "closed": "Fundraiser is not accepting payments",
        "blocked": "Fundraiser is blocked",
        "future": "Fundraiser has not started yet",
        "expired": "Fundraiser has already ended",
    }[state]
    assert response.json()["detail"] == expected_detail
