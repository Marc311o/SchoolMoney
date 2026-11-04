from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.models import Account
from app.modules.users.models import User

REAL_IBAN = "PL10105000997603123456789123"


def user_id(db: Session, email: str) -> UUID:
    return db.scalars(select(User.id).where(User.email == email)).one()


def wallet_row(db: Session, email: str) -> Account:
    """The wallet as stored, read fresh from the database."""
    return db.scalars(
        select(Account)
        .where(Account.user_id == user_id(db, email))
        .execution_options(populate_existing=True)
    ).one()


def top_up(client: TestClient, headers: dict[str, str], amount: str) -> dict:
    response = client.post("/api/accounts/me/top-up", json={"amount": amount}, headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def add_bank_account(
    client: TestClient,
    headers: dict[str, str],
    iban: str = REAL_IBAN,
    account_name: str | None = "My bank",
) -> dict:
    response = client.post(
        "/api/accounts/me/external-accounts",
        json={"iban": iban, "account_name": account_name},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()
