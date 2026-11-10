"""Admin guard and blocked users"""

from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.enums import UserStatus
from app.modules.users.models import User


def user_id(db: Session, email: str):
    return db.scalars(select(User).where(User.email == email)).one().id


def block(db: Session, email: str) -> None:
    db.scalars(select(User).where(User.email == email)).one().status = UserStatus.BLOCKED
    db.commit()


@pytest.fixture
def admin_endpoints(db: Session, parent) -> list[tuple[str, str, dict | None]]:
    """Every admin-only endpoint, aimed at the `parent` fixture's account."""
    target = user_id(db, "parent@example.com")
    return [
        ("PATCH", f"/api/users/{target}/email", {"email": "new@example.com"}),
        ("POST", f"/api/auth/users/{target}/password-reset", None),
    ]


# ---------------------------------------------------------------------------
# Admin guard
# ---------------------------------------------------------------------------


def test_admin_endpoints_require_login(client: TestClient, admin_endpoints):
    for method, url, body in admin_endpoints:
        assert client.request(method, url, json=body).status_code == 401, url


def test_parent_cannot_use_admin_endpoints(client: TestClient, parent, admin_endpoints):
    for method, url, body in admin_endpoints:
        response = client.request(method, url, json=body, headers=parent)
        assert response.status_code == 403, url
        assert response.json()["detail"] == "Admin access required"


def test_admin_can_use_admin_endpoints(client: TestClient, admin, admin_endpoints):
    expected = {"PATCH": 200, "POST": 204}
    with patch("app.modules.auth.service.send_password_reset_email"):
        for method, url, body in admin_endpoints:
            response = client.request(method, url, json=body, headers=admin)
            assert response.status_code == expected[method], (url, response.text)


def test_me_tells_the_frontend_who_is_admin(client: TestClient, parent, admin):
    assert client.get("/api/users/me", headers=parent).json()["role"] == "PARENT"
    assert client.get("/api/users/me", headers=admin).json()["role"] == "ADMIN"


def test_blocked_admin_is_refused(client: TestClient, db: Session, admin, admin_endpoints):
    block(db, "admin@example.com")
    method, url, body = admin_endpoints[0]

    response = client.request(method, url, json=body, headers=admin)
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"


# ---------------------------------------------------------------------------
# Blocked users
# ---------------------------------------------------------------------------


def test_blocking_ends_an_open_session_at_once(client: TestClient, db: Session, parent):
    """The access token is still valid, but every request is refused from now on."""
    assert client.get("/api/users/me", headers=parent).status_code == 200

    block(db, "parent@example.com")

    response = client.get("/api/users/me", headers=parent)
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"


@pytest.mark.parametrize(
    ("url", "body"),
    [
        ("/api/accounts/me/top-up", {"amount": "10.00"}),
        ("/api/fundraisers/{id}/payments", {"child_id": "{id}"}),
        ("/api/fundraisers/{id}/withdrawals", {"amount": "10.00"}),
        ("/api/fundraisers/{id}/deposits", {"amount": "10.00"}),
    ],
    ids=["top-up", "fundraiser payment", "withdrawal", "deposit"],
)
def test_blocked_user_cannot_move_money(client: TestClient, db: Session, parent, url, body):
    """Refused before the request is even looked at, whatever it points to."""
    block(db, "parent@example.com")
    some_id = str(uuid4())
    body = {key: value.replace("{id}", some_id) for key, value in body.items()}

    response = client.post(url.replace("{id}", some_id), json=body, headers=parent)
    assert response.status_code == 403
    assert response.json()["detail"] == "Account is blocked"
