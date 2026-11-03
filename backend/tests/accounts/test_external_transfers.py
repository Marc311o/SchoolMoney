from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.enums import TransactionType
from app.modules.accounts.models import ExternalTransfer, Transaction
from tests.accounts.helpers import add_bank_account, top_up, wallet_row

URL = "/api/accounts/me/external-transfers"


def transfer(client: TestClient, headers, account_id: str, amount: str, **extra):
    return client.post(
        URL,
        json={"external_account_id": account_id, "amount": amount, **extra},
        headers=headers,
    )


def outgoing(db: Session) -> list[Transaction]:
    return list(
        db.scalars(select(Transaction).where(Transaction.type == TransactionType.EXTERNAL_TRANSFER))
    )


def test_transfer_out(client: TestClient, db: Session, parent):
    top_up(client, parent, "100.00")
    bank = add_bank_account(client, parent)

    response = transfer(client, parent, bank["id"], "30.50")
    assert response.status_code == 200
    assert response.json()["balance"] == "69.50"

    [transaction] = outgoing(db)
    assert transaction.from_account_id == wallet_row(db, "parent@example.com").id
    assert transaction.to_account_id is None  # the money left SchoolMoney
    assert transaction.amount == Decimal("30.50")
    assert transaction.description == "Transfer to My bank"

    [link] = db.scalars(select(ExternalTransfer)).all()
    assert link.transaction_id == transaction.id
    assert str(link.external_account_id) == bank["id"]


def test_transfer_keeps_the_description(client: TestClient, db: Session, parent):
    top_up(client, parent, "10.00")
    bank = add_bank_account(client, parent)

    transfer(client, parent, bank["id"], "1.00", description="Rent")
    assert outgoing(db)[0].description == "Rent"


def test_description_falls_back_to_iban(client: TestClient, db: Session, parent):
    top_up(client, parent, "10.00")
    bank = add_bank_account(client, parent, account_name=None)

    transfer(client, parent, bank["id"], "1.00")
    assert outgoing(db)[0].description == f"Transfer to {bank['iban']}"


def test_whole_balance_can_be_sent(client: TestClient, parent):
    top_up(client, parent, "12.34")
    bank = add_bank_account(client, parent)

    assert transfer(client, parent, bank["id"], "12.34").json()["balance"] == "0.00"


def test_not_enough_money(client: TestClient, db: Session, parent):
    top_up(client, parent, "10.00")
    bank = add_bank_account(client, parent)

    response = transfer(client, parent, bank["id"], "10.01")
    assert response.status_code == 409
    assert response.json()["detail"] == "Not enough money in your wallet"
    assert wallet_row(db, "parent@example.com").balance == Decimal("10.00")
    assert outgoing(db) == []
    assert db.scalar(select(ExternalTransfer.id)) is None


def test_someone_elses_bank_account_is_not_found(client: TestClient, parent, auth_headers):
    top_up(client, parent, "10.00")
    their_bank = add_bank_account(client, auth_headers("other@example.com"))

    response = transfer(client, parent, their_bank["id"], "1.00")
    assert response.status_code == 404
    assert response.json()["detail"] == "Bank account not found"


def test_unknown_bank_account(client: TestClient, parent):
    top_up(client, parent, "10.00")
    assert transfer(client, parent, str(uuid4()), "1.00").status_code == 404


@pytest.mark.parametrize(
    "amount",
    ["0", "-1.00", "1.001", "abc"],
    ids=["zero", "negative", "three decimals", "not a number"],
)
def test_amount_validation(client: TestClient, db: Session, parent, amount):
    top_up(client, parent, "10.00")
    bank = add_bank_account(client, parent)

    assert transfer(client, parent, bank["id"], amount).status_code == 422
    assert wallet_row(db, "parent@example.com").balance == Decimal("10.00")
