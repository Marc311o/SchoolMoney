from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.models import Account
from app.modules.auth.models import AccountActivationToken
from app.modules.auth.security import hash_reset_token
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
    with patch("app.modules.auth.service.send_account_activation_email"):
        return client.post("/api/auth/register", json=payload)


def activate_user(db: Session, email: str) -> None:
    user = db.scalars(select(User).where(User.email == email)).one()
    user.status = UserStatus.ACTIVE
    db.commit()


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
    assert data["status"] == UserStatus.PENDING_ACTIVATION.value
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data

    user = db.scalars(select(User).where(User.email == "test.parent@example.com")).one()
    assert user.password_hash != PASSWORD

    account = db.scalars(select(Account).where(Account.user_id == user.id)).one()
    assert account.balance == Decimal("0.00")
    assert account.iban.startswith("PL")

    token_record = db.scalars(
        select(AccountActivationToken).where(AccountActivationToken.user_id == user.id)
    ).first()
    assert token_record is not None


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
# Account Activation
# ---------------------------------------------------------------------------


@patch("app.modules.auth.service.send_account_activation_email")
def test_account_activation_full_flow(mock_email, client: TestClient, db: Session):
    email = "activation.flow@example.com"
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Kamil",
        "last_name": "Nowak",
    }
    reg_res = client.post("/api/auth/register", json=payload)
    assert reg_res.status_code == 201
    assert reg_res.json()["status"] == UserStatus.PENDING_ACTIVATION.value
    assert mock_email.called

    # Attempt login before activation -> 403 Forbidden
    login_pre = login(client, email)
    assert login_pre.status_code == 403
    assert login_pre.json()["detail"] == "Account is not activated"

    # Extract token from mailer call
    activation_url = mock_email.call_args[0][1]
    token = activation_url.split("token=")[-1]
    assert len(token) in (42, 43)

    # Activate account -> 204 No Content
    act_res = client.post("/api/auth/activate", json={"token": token})
    assert act_res.status_code == 204

    # Verify database state
    user = db.scalars(select(User).where(User.email == email)).one()
    assert user.status == UserStatus.ACTIVE

    token_record = db.scalars(
        select(AccountActivationToken).where(AccountActivationToken.user_id == user.id)
    ).first()
    assert token_record is None

    # Successful login after activation -> 200 OK
    login_post = login(client, email)
    assert login_post.status_code == 200
    assert "access_token" in login_post.json()

    # Attempt to reuse consumed token -> 400 Bad Request
    act_reuse = client.post("/api/auth/activate", json={"token": token})
    assert act_reuse.status_code == 400
    assert act_reuse.json()["detail"] == "Invalid or expired activation token"


@patch("app.modules.auth.service.send_account_activation_email")
def test_account_activation_expired_token(mock_email, client: TestClient, db: Session):
    email = "activation.expired@example.com"
    payload = {
        "email": email,
        "password": PASSWORD,
        "first_name": "Ewa",
        "last_name": "Zielińska",
    }
    client.post("/api/auth/register", json=payload)

    activation_url = mock_email.call_args[0][1]
    token = activation_url.split("token=")[-1]

    # Simulate token expiration (>30 mins)
    token_hash = hash_reset_token(token)
    token_record = db.scalars(
        select(AccountActivationToken).where(AccountActivationToken.token_hash == token_hash)
    ).one()
    token_record.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()

    response = client.post("/api/auth/activate", json={"token": token})
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid or expired activation token"

    user = db.scalars(select(User).where(User.email == email)).one()
    assert user.status == UserStatus.PENDING_ACTIVATION


def test_account_activation_validation(client: TestClient):
    assert client.post("/api/auth/activate", json={"token": "too_short"}).status_code == 422
    assert client.post("/api/auth/activate", json={"token": "x" * 43}).status_code == 400


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def test_login_success(client: TestClient, db: Session):
    email = "login.test@example.com"
    register(client, email)
    activate_user(db, email)

    response = login(client, email)
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
    email = "blocked@example.com"
    register(client, email)
    activate_user(db, email)
    block(db, email)

    response = login(client, email)
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------


def test_refresh_token_success(client: TestClient, db: Session):
    email = "refresh.test@example.com"
    register(client, email)
    activate_user(db, email)
    refresh_token = login(client, email).json()["refresh_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200

    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens["token_type"] == "bearer"

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert set(me.json()) == {"id", "role", "status"}
    assert me.json()["role"] == UserRole.PARENT.value


def test_refresh_token_invalid(client: TestClient):
    response = client.post("/api/auth/refresh", json={"refresh_token": "not.a.valid.jwt.token"})
    assert response.status_code == 401


def test_refresh_rejects_access_token(client: TestClient, db: Session):
    email = "type.mismatch@example.com"
    register(client, email)
    activate_user(db, email)
    access_token = login(client, email).json()["access_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401


def test_refresh_token_blocked_user(client: TestClient, db: Session):
    email = "refresh.blocked@example.com"
    register(client, email)
    activate_user(db, email)
    refresh_token = login(client, email).json()["refresh_token"]
    block(db, email)

    response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"


# ---------------------------------------------------------------------------
# Me & Profile
# ---------------------------------------------------------------------------


def test_get_me_success(client: TestClient, parent):
    response = client.get("/api/auth/me", headers=parent)

    assert response.status_code == 200
    assert set(response.json()) == {"id", "role", "status"}
    assert response.json()["role"] == UserRole.PARENT.value
    assert response.json()["status"] == UserStatus.ACTIVE.value


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer invalid.token.payload"}],
    ids=["no token", "invalid token"],
)
def test_get_me_unauthorized(client: TestClient, headers):
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_update_parent_profile_names(client: TestClient, parent):
    payload = {
        "first_name": "Joanna",
        "last_name": "Nowak",
    }
    response = client.patch("/api/users/me", headers=parent, json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["first_name"] == "Joanna"
    assert data["last_name"] == "Nowak"


def test_update_profile_unauthorized(client: TestClient):
    response = client.patch(
        "/api/users/me",
        json={"first_name": "Hacker"},
    )
    assert response.status_code == 401


def test_change_password(client: TestClient, parent):
    new_password = "NoweHaslo123!"

    response = client.patch(
        "/api/auth/password",
        headers=parent,
        json={
            "current_password": PASSWORD,
            "new_password": new_password,
        },
    )

    assert response.status_code == 204
    assert response.content == b""

    old_login = client.post(
        "/api/auth/login",
        json={
            "email": "parent@example.com",
            "password": PASSWORD,
        },
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/auth/login",
        json={
            "email": "parent@example.com",
            "password": new_password,
        },
    )
    assert new_login.status_code == 200
