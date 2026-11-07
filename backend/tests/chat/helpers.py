from dataclasses import dataclass
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.enums import UserRole
from app.modules.users.models import User
from tests.conftest import AuthHeaders


@dataclass
class Person:
    id: UUID
    headers: dict[str, str]


def person(
    db: Session,
    auth_headers: AuthHeaders,
    email: str,
    first_name: str,
    last_name: str = "Kot",
    role: UserRole = UserRole.PARENT,
) -> Person:
    """A logged-in user with their own name (auth_headers names everyone Anna Kot)."""
    headers = auth_headers(email)
    user = db.scalars(select(User).where(User.email == email)).one()
    user.first_name, user.last_name, user.role = first_name, last_name, role
    db.commit()
    return Person(user.id, headers)


def list_chats(client: TestClient, who: Person, **params) -> list[dict]:
    response = client.get("/api/chats", params=params, headers=who.headers)
    assert response.status_code == 200, response.text
    return response.json()


def send(client: TestClient, who: Person, chat_id: str, content: str = "Hello") -> dict:
    response = client.post(
        f"/api/chats/{chat_id}/messages", json={"content": content}, headers=who.headers
    )
    assert response.status_code == 201, response.text
    return response.json()


def messages(client: TestClient, who: Person, chat_id: str, **params) -> dict:
    response = client.get(f"/api/chats/{chat_id}/messages", params=params, headers=who.headers)
    assert response.status_code == 200, response.text
    return response.json()


def open_direct(client: TestClient, who: Person, other: Person) -> dict:
    response = client.post(
        "/api/chats/direct", json={"user_id": str(other.id)}, headers=who.headers
    )
    assert response.status_code == 200, response.text
    return response.json()
