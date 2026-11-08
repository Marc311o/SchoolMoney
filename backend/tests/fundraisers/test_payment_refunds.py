from decimal import Decimal
from uuid import UUID

from app.modules.accounts.enums import TransactionType
from app.modules.accounts.models import Transaction
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.models import Fundraiser
from tests.fundraisers.helpers import (
    RATE,
    URL,
    create_school_setup,
    create_test_fundraiser,
    top_up_wallet,
)


def test_parent_refunds_own_payment(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "100.00")

    res_pay = client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=parent,
        json={"child_id": school.own_child_id},
    )
    payment_id = res_pay.json()["id"]

    res_refund = client.post(
        f"{URL}/{fundraiser_id}/payments/{payment_id}/refund",
        headers=parent,
    )
    assert res_refund.status_code == 200
    data = res_refund.json()
    assert data["refunded_at"] is not None
    assert data["refund_transaction_id"] is not None

    refund_tx = db.get(Transaction, UUID(data["refund_transaction_id"]))
    assert refund_tx.type == TransactionType.PAYMENT_REFUND
    assert refund_tx.amount == RATE

    wallet = client.get("/api/accounts/me", headers=parent).json()
    assert Decimal(wallet["balance"]) == Decimal("100.00")

    res_second = client.post(
        f"{URL}/{fundraiser_id}/payments/{payment_id}/refund",
        headers=parent,
    )
    assert res_second.status_code == 409
    assert res_second.json()["detail"] == "Payment already refunded"


def test_outsider_cannot_refund_payment(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    other_parent = school.headers["other_parent"]
    top_up_wallet(client, parent, "100.00")

    res_pay = client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=parent,
        json={"child_id": school.own_child_id},
    )
    payment_id = res_pay.json()["id"]

    res = client.post(
        f"{URL}/{fundraiser_id}/payments/{payment_id}/refund",
        headers=other_parent,
    )
    assert res.status_code == 404


def test_refund_fails_if_fundraiser_closed(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "100.00")

    res_pay = client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=parent,
        json={"child_id": school.own_child_id},
    )
    payment_id = res_pay.json()["id"]

    fundraiser = db.get(Fundraiser, fundraiser_id)
    fundraiser.status = FundraiserStatus.CLOSED
    db.commit()

    res = client.post(
        f"{URL}/{fundraiser_id}/payments/{payment_id}/refund",
        headers=parent,
    )
    assert res.status_code == 409
    assert res.json()["detail"] == "Fundraiser is not accepting refund requests"
