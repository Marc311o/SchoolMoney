"""Admin: the chat with a treasurer, started from the admin side (#147)."""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from tests.chat.helpers import Person, list_chats, messages, person, send
from tests.conftest import AuthHeaders
from tests.factories import make_class


@pytest.fixture
def adam(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "adam@example.com", "Adam", "Admin", role=UserRole.ADMIN)


@pytest.fixture
def anna(db: Session, auth_headers: AuthHeaders) -> Person:
    """Treasurer of 3B and 1A."""
    anna = person(db, auth_headers, "anna@example.com", "Anna", "Nowak")
    make_class(db, anna.id, name="3B")
    make_class(db, anna.id, name="1A")
    db.commit()
    return anna


@pytest.fixture
def marek(db: Session, auth_headers: AuthHeaders) -> Person:
    """A parent who runs no class."""
    return person(db, auth_headers, "marek@example.com", "Marek")


def open_chat(client: TestClient, admin: Person, treasurer_id) -> dict:
    response = client.post(f"/api/admin/treasurers/{treasurer_id}/chat", headers=admin.headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_admin_only(client: TestClient, anna, marek):
    url = f"/api/admin/treasurers/{anna.id}/chat"
    assert client.post(url).status_code == 401
    assert client.post(url, headers=marek.headers).status_code == 403
    assert client.post(url, headers=anna.headers).status_code == 403


def test_admin_starts_a_chat_with_a_treasurer(client: TestClient, adam, anna):
    chat = open_chat(client, adam, anna.id)

    assert chat["kind"] == "ADMIN"
    assert chat["title"] == "Anna Nowak"
    assert chat["other_user"]["id"] == str(anna.id)
    assert chat["treasurer_classes"] == ["1A", "3B"]
    assert chat["other_user_blocked"] is False
    assert chat["last_message"] is None
    assert open_chat(client, adam, anna.id)["id"] == chat["id"]  # not a second one


def test_it_is_the_chat_the_treasurer_reaches(
    client: TestClient, db: Session, auth_headers: AuthHeaders, adam, anna
):
    ola = person(db, auth_headers, "ola@example.com", "Ola", "Admin", role=UserRole.ADMIN)
    chat = open_chat(client, adam, anna.id)
    send(client, adam, chat["id"], "Your class report is missing")

    mine = client.post("/api/chats/admin", headers=anna.headers).json()
    assert mine["id"] == chat["id"]
    assert mine["title"] == "Administrator"
    assert mine["treasurer_classes"] is None
    assert mine["unread_count"] == 1

    assert open_chat(client, ola, anna.id)["id"] == chat["id"]
    send(client, anna, chat["id"], "Sending it today")
    assert [m["content"] for m in messages(client, ola, chat["id"])["messages"]] == [
        "Your class report is missing",
        "Sending it today",
    ]


def test_opens_the_chat_the_treasurer_started(client: TestClient, adam, anna):
    started = client.post("/api/chats/admin", headers=anna.headers).json()
    assert open_chat(client, adam, anna.id)["id"] == started["id"]


def test_blocked_treasurer_is_marked(client: TestClient, db: Session, adam, anna):
    db.get(User, anna.id).status = UserStatus.BLOCKED
    db.commit()

    chat = open_chat(client, adam, anna.id)
    assert chat["other_user_blocked"] is True
    [listed] = list_chats(client, adam)
    assert listed["other_user_blocked"] is True


@pytest.mark.parametrize("target", ["missing", "not a treasurer", "admin"])
def test_only_treasurers(client: TestClient, adam, marek, target):
    user_id = {"missing": uuid4(), "not a treasurer": marek.id, "admin": adam.id}[target]
    response = client.post(f"/api/admin/treasurers/{user_id}/chat", headers=adam.headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Treasurer not found"
