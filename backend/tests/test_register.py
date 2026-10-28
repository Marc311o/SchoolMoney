from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.models import Account
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User


def test_register_success(client: TestClient, db: Session):
    payload = {
        "email": "test.parent@example.com",
        "password": "strongPassword123!",
        "first_name": "Anna",
        "last_name": "Kowalska",
        "avatar_url": "https://example.com/avatar.png",
    }

    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["email"] == "test.parent@example.com"
    assert data["first_name"] == "Anna"
    assert data["last_name"] == "Kowalska"
    assert data["role"] == UserRole.PARENT.value
    assert data["status"] == UserStatus.ACTIVE.value
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data

    user = db.execute(select(User).where(User.email == payload["email"])).scalar_one_or_none()
    assert user is not None
    assert user.password_hash != payload["password"]

    account = db.execute(select(Account).where(Account.user_id == user.id)).scalar_one_or_none()
    assert account is not None
    assert account.balance == Decimal("0.00")
    assert account.iban.startswith("PL")


def test_register_duplicate_email(client: TestClient):
    payload = {
        "email": "duplicate@example.com",
        "password": "strongPassword123!",
        "first_name": "Jan",
        "last_name": "Nowak",
    }

    first_res = client.post("/api/auth/register", json=payload)
    assert first_res.status_code == 201

    second_res = client.post("/api/auth/register", json=payload)
    assert second_res.status_code == 409
    assert second_res.json()["detail"] == "User with this email already exists"


def test_register_invalid_email(client: TestClient):
    payload = {
        "email": "not-an-email",
        "password": "strongPassword123!",
        "first_name": "Jan",
        "last_name": "Nowak",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422


def test_register_password_too_short(client: TestClient):
    payload = {
        "email": "short@example.com",
        "password": "123",
        "first_name": "Jan",
        "last_name": "Nowak",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 422
