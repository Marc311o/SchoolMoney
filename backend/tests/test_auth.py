from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.models import Account
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from tests.conftest import PASSWORD


def register(client: TestClient, email: str, **overrides):
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Anna",
        "last_name": "Kowalska",
        **overrides,
    }
    return client.post("/api/auth/register", json=payload)


def login(client: TestClient, email: str, password: str = PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def block(db: Session, email: str) -> None:
    db.scalars(select(User).where(User.email == email)).one().status = UserStatus.BLOCKED
    db.commit()


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------


def test_register_success(client: TestClient, db: Session):
    response = register(
        client, "test.parent@example.com", avatar_url="https://example.com/avatar.png"
    )
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

    user = db.scalars(select(User).where(User.email == "test.parent@example.com")).one()
    assert user.password_hash != PASSWORD

    account = db.scalars(select(Account).where(Account.user_id == user.id)).one()
    assert account.balance == Decimal("0.00")
    assert account.iban.startswith("PL")


def test_register_duplicate_email(client: TestClient):
    assert register(client, "duplicate@example.com").status_code == 201

    response = register(client, "duplicate@example.com")
    assert response.status_code == 409
    assert response.json()["detail"] == "User with this email already exists"


@pytest.mark.parametrize(
    ("email", "password"),
    [("not-an-email", PASSWORD), ("short@example.com", "123")],
    ids=["invalid email", "password too short"],
)
def test_register_validation(client: TestClient, email: str, password: str):
    assert register(client, email, password=password).status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def test_login_success(client: TestClient):
    register(client, "login.test@example.com")

    response = login(client, "login.test@example.com")
    assert response.status_code == 200

    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"


def test_login_invalid_credentials(client: TestClient):
    response = login(client, "unknown@example.com")
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_blocked_user(client: TestClient, db: Session):
    register(client, "blocked@example.com")
    block(db, "blocked@example.com")

    response = login(client, "blocked@example.com")
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------


def test_refresh_token_success(client: TestClient):
    register(client, "refresh.test@example.com")
    refresh_token = login(client, "refresh.test@example.com").json()["refresh_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200

    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "refresh.test@example.com"


def test_refresh_token_invalid(client: TestClient):
    response = client.post("/api/auth/refresh", json={"refresh_token": "not.a.valid.jwt.token"})
    assert response.status_code == 401


def test_refresh_rejects_access_token(client: TestClient):
    register(client, "type.mismatch@example.com")
    access_token = login(client, "type.mismatch@example.com").json()["access_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401


def test_refresh_token_blocked_user(client: TestClient, db: Session):
    register(client, "refresh.blocked@example.com")
    refresh_token = login(client, "refresh.blocked@example.com").json()["refresh_token"]
    block(db, "refresh.blocked@example.com")

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------


def test_get_me_success(client: TestClient, parent):
    response = client.get("/api/auth/me", headers=parent)
    assert response.status_code == 200

    data = response.json()
    assert data["email"] == "parent@example.com"
    assert data["first_name"] == "Anna"
    assert data["last_name"] == "Kot"


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer invalid.token.payload"}],
    ids=["no token", "invalid token"],
)
def test_get_me_unauthorized(client: TestClient, headers):
    assert client.get("/api/auth/me", headers=headers).status_code == 401
