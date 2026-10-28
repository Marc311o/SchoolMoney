from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.enums import UserStatus
from app.modules.users.models import User


def test_login_success(client: TestClient):
    register_payload = {
        "email": "login.test@example.com",
        "password": "safePassword123!",
        "first_name": "Tomasz",
        "last_name": "Kot",
    }
    reg_res = client.post("/api/auth/register", json=register_payload)
    assert reg_res.status_code == 201

    login_payload = {
        "email": "login.test@example.com",
        "password": "safePassword123!",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200

    tokens = response.json()
    assert "access_token" in tokens
    assert tokens["token_type"] == "bearer"


def test_login_invalid_credentials(client: TestClient):
    login_payload = {
        "email": "unknown@example.com",
        "password": "safePassword123!",
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_blocked_user(client: TestClient, db: Session):
    register_payload = {
        "email": "blocked@example.com",
        "password": "safePassword123!",
        "first_name": "Zablokowany",
        "last_name": "User",
    }
    client.post("/api/auth/register", json=register_payload)

    user = db.query(User).filter(User.email == register_payload["email"]).first()
    user.status = UserStatus.BLOCKED
    db.commit()

    login_res = client.post(
        "/api/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert login_res.status_code == 403
    assert login_res.json()["detail"] == "Account is blocked"


def test_get_me_success(client: TestClient):
    client.post(
        "/api/auth/register",
        json={
            "email": "me.test@example.com",
            "password": "password123!",
            "first_name": "Marek",
            "last_name": "Wójcik",
        },
    )
    login_res = client.post(
        "/api/auth/login",
        json={"email": "me.test@example.com", "password": "password123!"},
    )
    token = login_res.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200

    data = me_res.json()
    assert data["email"] == "me.test@example.com"
    assert data["first_name"] == "Marek"
    assert data["last_name"] == "Wójcik"


def test_get_me_unauthorized(client: TestClient):
    res_no_auth = client.get("/api/auth/me")
    assert res_no_auth.status_code == 401

    headers = {"Authorization": "Bearer invalid.token.payload"}
    res_invalid = client.get("/api/auth/me", headers=headers)
    assert res_invalid.status_code == 401
