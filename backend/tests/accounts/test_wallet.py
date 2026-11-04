from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.enums import TransactionType
from app.modules.accounts.models import Transaction
from app.modules.users.enums import UserStatus
from app.modules.users.models import User
from tests.accounts.helpers import top_up, user_id, wallet_row

ENDPOINTS = [
    ("get", "/api/accounts/me", None),
    ("post", "/api/accounts/me/top-up", {"amount": "10.00"}),
    ("get", "/api/accounts/me/external-accounts", None),
    ("post", "/api/accounts/me/external-accounts", {"iban": "PL10105000997603123456789123"}),
    (
        "post",
        "/api/accounts/me/external-transfers",
        {"external_account_id": str(uuid4()), "amount": "1.00"},
    ),
]


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(("method", "url", "body"), ENDPOINTS)
def test_requires_login(client: TestClient, method, url, body):
    assert client.request(method, url, json=body).status_code == 401


@pytest.mark.parametrize(("method", "url", "body"), ENDPOINTS)
def test_blocked_user_is_refused(client: TestClient, db: Session, parent, method, url, body):
    db.scalars(
        select(User).where(User.email == "parent@example.com")
    ).one().status = UserStatus.BLOCKED
    db.commit()

    assert client.request(method, url, json=body, headers=parent).status_code == 403


# ---------------------------------------------------------------------------
# GET /accounts/me
# ---------------------------------------------------------------------------


def test_new_wallet_is_empty(client: TestClient, parent):
    response = client.get("/api/accounts/me", headers=parent)
    assert response.status_code == 200

    wallet = response.json()
    assert wallet["balance"] == "0.00"
    assert wallet["iban"].startswith("PL")
    assert wallet["account_type"] == "USER"


# ---------------------------------------------------------------------------
# POST /accounts/me/top-up
# ---------------------------------------------------------------------------


def test_top_up_adds_money_and_records_one_transaction(client: TestClient, db: Session, parent):
    wallet = top_up(client, parent, "50.00")

    assert wallet["balance"] == "50.00"
    assert client.get("/api/accounts/me", headers=parent).json()["balance"] == "50.00"

    [transaction] = db.scalars(
        select(Transaction).where(
            Transaction.to_account_id == wallet_row(db, "parent@example.com").id
        )
    ).all()
    assert transaction.type == TransactionType.TOP_UP
    assert transaction.amount == Decimal("50.00")
    assert transaction.from_account_id is None
    assert transaction.created_by == user_id(db, "parent@example.com")
    assert transaction.description == "Top-up"


def test_top_ups_add_up_to_the_grosz(client: TestClient, db: Session, parent):
    top_up(client, parent, "0.10")
    wallet = top_up(client, parent, "0.20")

    assert wallet["balance"] == "0.30"
    assert wallet_row(db, "parent@example.com").balance == Decimal("0.30")


def test_top_up_keeps_the_description(client: TestClient, db: Session, parent):
    client.post(
        "/api/accounts/me/top-up",
        json={"amount": "5.00", "description": "Pocket money"},
        headers=parent,
    )
    assert db.scalar(select(Transaction.description)) == "Pocket money"


def test_top_up_allows_the_maximum(client: TestClient, parent):
    assert top_up(client, parent, "10000.00")["balance"] == "10000.00"


@pytest.mark.parametrize(
    "body",
    [
        {"amount": "0"},
        {"amount": "-5.00"},
        {"amount": "10.001"},
        {"amount": "10000.01"},
        {"amount": "ten"},
        {},
        {"amount": "5.00", "account_id": str(uuid4())},
    ],
    ids=[
        "zero",
        "negative",
        "three decimals",
        "over the limit",
        "not a number",
        "missing",
        "extra field",
    ],
)
def test_top_up_validation(client: TestClient, db: Session, parent, body):
    response = client.post("/api/accounts/me/top-up", json=body, headers=parent)

    assert response.status_code == 422
    assert wallet_row(db, "parent@example.com").balance == Decimal("0.00")
    assert db.scalar(select(Transaction.id)) is None


def test_top_up_changes_only_my_wallet(client: TestClient, db: Session, parent, auth_headers):
    auth_headers("other@example.com")
    top_up(client, parent, "20.00")

    assert wallet_row(db, "other@example.com").balance == Decimal("0.00")
