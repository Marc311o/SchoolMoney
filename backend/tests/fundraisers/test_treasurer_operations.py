from decimal import Decimal
from uuid import UUID

from app.modules.accounts.enums import TransactionType
from app.modules.accounts.models import Transaction
from app.modules.fundraisers.enums import TreasurerOperationDirection
from tests.fundraisers.helpers import (
    URL,
    create_school_setup,
    create_test_fundraiser,
    top_up_wallet,
)


def test_treasurer_withdrawal_happy_path(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]

    top_up_wallet(client, parent, "100.00")
    client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=parent,
        json={"child_id": school.own_child_id},
    )

    res = client.post(
        f"{URL}/{fundraiser_id}/withdrawals",
        headers=treasurer,
        json={"amount": "30.00", "description": "Advance for tickets"},
    )
    assert res.status_code == 201
    data = res.json()
    assert Decimal(data["amount"]) == Decimal("30.00")
    assert data["direction"] == TreasurerOperationDirection.WITHDRAWAL

    tx = db.get(Transaction, UUID(data["transaction_id"]))
    assert tx.type == TransactionType.TREASURER_WITHDRAWAL
    assert tx.amount == Decimal("30.00")

    detail = client.get(f"{URL}/{fundraiser_id}", headers=treasurer).json()
    assert Decimal(detail["progress"]["treasurer_withdrawn_total"]) == Decimal("30.00")
    assert Decimal(detail["progress"]["current_balance"]) == Decimal("20.25")


def test_parent_cannot_withdraw(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]

    res = client.post(
        f"{URL}/{fundraiser_id}/withdrawals",
        headers=parent,
        json={"amount": "10.00"},
    )
    assert res.status_code == 404


def test_treasurer_cannot_withdraw_more_than_fundraiser_balance(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    res = client.post(
        f"{URL}/{fundraiser_id}/withdrawals",
        headers=treasurer,
        json={"amount": "10.00"},
    )
    assert res.status_code == 409
    assert res.json()["detail"] == "Not enough balance on the fundraiser account"


def test_treasurer_deposit_happy_path(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    top_up_wallet(client, treasurer, "50.00")

    res = client.post(
        f"{URL}/{fundraiser_id}/deposits",
        headers=treasurer,
        json={"amount": "20.00", "description": "Returning unspent advance"},
    )
    assert res.status_code == 201
    data = res.json()
    assert Decimal(data["amount"]) == Decimal("20.00")
    assert data["direction"] == TreasurerOperationDirection.DEPOSIT

    detail = client.get(f"{URL}/{fundraiser_id}", headers=treasurer).json()
    assert Decimal(detail["progress"]["treasurer_deposited_total"]) == Decimal("20.00")
    assert Decimal(detail["progress"]["current_balance"]) == Decimal("20.00")


def test_treasurer_deposit_fails_if_insufficient_wallet(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]

    res = client.post(
        f"{URL}/{fundraiser_id}/deposits",
        headers=treasurer,
        json={"amount": "100.00"},
    )
    assert res.status_code == 409
    assert res.json()["detail"] == "Not enough money in your wallet"
