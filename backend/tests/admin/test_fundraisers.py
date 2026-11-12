"""list, search and block fundraisers"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.enums import AccountType
from app.modules.accounts.models import Account
from app.modules.accounts.utils import generate_fake_iban
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.users.models import User
from tests.conftest import AuthHeaders
from tests.factories import make_child, make_class, make_fundraiser, make_obligation, make_payment
from tests.fundraisers.helpers import create_school_setup, create_test_fundraiser, top_up_wallet

URL = "/api/admin/fundraisers"


def account(db: Session, email: str) -> User:
    return db.scalars(select(User).where(User.email == email)).one()


@pytest.fixture
def fundraisers(db: Session, auth_headers: AuthHeaders) -> dict[str, str]:
    """Three fundraisers, newest first: a blocked one in 1A, a closed and an active one in 3B.
    The active one has two children: one paid, one paid and got the money back."""
    auth_headers("anna@example.com")
    auth_headers("marek@example.com")
    anna, marek = account(db, "anna@example.com"), account(db, "marek@example.com")
    anna.first_name, anna.last_name = "Anna", "Nowak"
    marek.first_name, marek.last_name = "Marek", "Lis"

    class_3b = make_class(db, anna.id, name="3B")
    class_1a = make_class(db, marek.id, name="1A")
    trip = make_fundraiser(db, class_3b, name="Theatre trip")
    fair = make_fundraiser(db, class_3b, FundraiserStatus.CLOSED, name="Book fair")
    pool = make_fundraiser(db, class_1a, name="Swimming lessons")
    pool.is_blocked = True

    now = datetime.now(UTC)
    for age, fundraiser in enumerate([pool, fair, trip]):
        fundraiser.created_at = now - timedelta(days=age)

    paid, refunded = make_child(db, anna.id), make_child(db, anna.id, first_name="Jan")
    for child in (paid, refunded):
        make_obligation(db, trip, child.id)
    make_payment(db, trip, paid.id)
    make_payment(db, trip, refunded.id, refunded=True)
    db.add(
        Account(
            id=uuid4(),
            fundraiser_id=trip.id,
            iban=generate_fake_iban(),
            account_type=AccountType.FUNDRAISER,
            balance=Decimal("50.00"),
        )
    )
    db.commit()
    return {"trip": str(trip.id), "fair": str(fair.id), "pool": str(pool.id)}


def names(response) -> list[str]:
    assert response.status_code == 200, response.text
    return [row["name"] for row in response.json()["items"]]


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


def test_admin_only(client: TestClient, parent):
    target = f"{URL}/{uuid4()}"
    assert client.get(URL).status_code == 401
    assert client.get(URL, headers=parent).status_code == 403
    assert client.patch(target, json={"is_blocked": True}).status_code == 401
    assert client.patch(target, json={"is_blocked": True}, headers=parent).status_code == 403


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


def test_lists_every_fundraiser_newest_first(client: TestClient, admin, fundraisers):
    response = client.get(URL, headers=admin)

    assert names(response) == ["Swimming lessons", "Book fair", "Theatre trip"]
    assert response.json()["total"] == 3


def test_row_shows_class_treasurer_payments_and_money(client: TestClient, admin, fundraisers):
    rows = {row["name"]: row for row in client.get(URL, headers=admin).json()["items"]}

    trip = rows["Theatre trip"]
    assert trip["school_class"]["name"] == "3B"
    assert trip["school_class"]["treasurer"]["first_name"] == "Anna"
    assert (trip["children_count"], trip["paid_count"]) == (2, 1)  # the refund does not count
    assert trip["balance"] == "50.00"
    assert trip["is_blocked"] is False
    assert rows["Swimming lessons"]["is_blocked"] is True
    assert rows["Book fair"]["balance"] == "0.00"  # no account yet


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("theatre", ["Theatre trip"]),
        ("1a", ["Swimming lessons"]),
        ("anna now", ["Book fair", "Theatre trip"]),
        ("nothing", []),
    ],
    ids=["fundraiser", "class", "treasurer", "no match"],
)
def test_search(client: TestClient, admin, fundraisers, q, expected):
    assert names(client.get(URL, params={"q": q}, headers=admin)) == expected


@pytest.mark.parametrize(
    ("params", "expected"),
    [
        ({"status": "CLOSED"}, ["Book fair"]),
        ({"status": "ACTIVE", "blocked": False}, ["Theatre trip"]),
        ({"blocked": True}, ["Swimming lessons"]),
    ],
    ids=["closed", "active and not blocked", "blocked"],
)
def test_filters(client: TestClient, admin, fundraisers, params, expected):
    assert names(client.get(URL, params=params, headers=admin)) == expected


def test_pages(client: TestClient, admin, fundraisers):
    second = client.get(URL, params={"page_size": 2, "page": 2}, headers=admin).json()
    assert [row["name"] for row in second["items"]] == ["Theatre trip"]
    assert (second["total"], second["pages"]) == (3, 2)


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 101}, {"status": "OPEN"}])
def test_bad_params(client: TestClient, admin, params):
    assert client.get(URL, params=params, headers=admin).status_code == 422


# ---------------------------------------------------------------------------
# Block and unblock
# ---------------------------------------------------------------------------


def test_block_and_unblock(client: TestClient, admin, fundraisers):
    url = f"{URL}/{fundraisers['trip']}"

    response = client.patch(url, json={"is_blocked": True}, headers=admin)
    assert response.status_code == 200
    assert response.json()["is_blocked"] is True
    assert response.json()["paid_count"] == 1  # the full row comes back

    response = client.patch(url, json={"is_blocked": False}, headers=admin)
    assert response.json()["is_blocked"] is False


def test_blocked_fundraiser_accepts_no_payments(
    client: TestClient, db: Session, admin, auth_headers
):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    top_up_wallet(client, parent)
    pay = f"/api/fundraisers/{fundraiser_id}/payments"
    body = {"child_id": school.own_child_id}

    client.patch(f"{URL}/{fundraiser_id}", json={"is_blocked": True}, headers=admin)
    response = client.post(pay, json=body, headers=parent)
    assert response.status_code == 409
    assert response.json()["detail"] == "Fundraiser is blocked"

    client.patch(f"{URL}/{fundraiser_id}", json={"is_blocked": False}, headers=admin)
    assert client.post(pay, json=body, headers=parent).status_code == 201


@pytest.mark.parametrize("body", [{}, {"is_blocked": "maybe"}])
def test_block_validation(client: TestClient, admin, fundraisers, body):
    response = client.patch(f"{URL}/{fundraisers['trip']}", json=body, headers=admin)
    assert response.status_code == 422


def test_block_unknown_fundraiser(client: TestClient, admin):
    response = client.patch(f"{URL}/{uuid4()}", json={"is_blocked": True}, headers=admin)
    assert response.status_code == 404
