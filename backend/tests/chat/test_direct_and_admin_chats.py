from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from tests.chat.helpers import Person, list_chats, messages, open_direct, person, send
from tests.conftest import AuthHeaders
from tests.factories import make_child, make_class, make_membership


@pytest.fixture
def anna(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "anna@example.com", "Anna", "Nowak")


@pytest.fixture
def marek(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "marek@example.com", "Marek", "Lis")


@pytest.fixture
def admin(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "admin@example.com", "Adam", "Admin", role=UserRole.ADMIN)


# ---------------------------------------------------------------------------
# Direct chats
# ---------------------------------------------------------------------------


def test_any_two_parents_can_talk(client: TestClient, anna, marek):
    """No shared class needed."""
    chat = open_direct(client, anna, marek)

    assert chat["kind"] == "DIRECT"
    assert chat["title"] == "Marek Lis"
    assert chat["other_user"]["id"] == str(marek.id)
    assert chat["class_id"] is None

    send(client, anna, chat["id"], "Hi Marek")
    [seen_by_marek] = list_chats(client, marek)
    assert seen_by_marek["id"] == chat["id"]
    assert seen_by_marek["title"] == "Anna Nowak"
    assert seen_by_marek["unread_count"] == 1
    assert chat["children_count"] is None


def test_opening_again_returns_the_same_chat(client: TestClient, anna, marek):
    first = open_direct(client, anna, marek)
    assert open_direct(client, anna, marek)["id"] == first["id"]
    assert open_direct(client, marek, anna)["id"] == first["id"]


def test_third_person_cannot_read_a_direct_chat(
    client: TestClient, db: Session, auth_headers: AuthHeaders, anna, marek
):
    chat = open_direct(client, anna, marek)
    ewa = person(db, auth_headers, "ewa@example.com", "Ewa")

    assert client.get(f"/api/chats/{chat['id']}", headers=ewa.headers).status_code == 404
    assert client.get(f"/api/chats/{chat['id']}/messages", headers=ewa.headers).status_code == 404
    assert list_chats(client, ewa) == []


def test_cannot_chat_with_yourself(client: TestClient, anna):
    response = client.post(
        "/api/chats/direct", json={"user_id": str(anna.id)}, headers=anna.headers
    )
    assert response.status_code == 422


@pytest.mark.parametrize("target", ["missing", "blocked", "admin"])
def test_cannot_open_direct_chat_with_unknown_blocked_or_admin(
    client: TestClient, db: Session, anna, marek, admin, target
):
    if target == "blocked":
        db.get(User, marek.id).status = UserStatus.BLOCKED
        db.commit()
    user_id = {"missing": uuid4(), "blocked": marek.id, "admin": admin.id}[target]

    response = client.post(
        "/api/chats/direct", json={"user_id": str(user_id)}, headers=anna.headers
    )
    assert response.status_code == 404


def test_contacts_search_scoped_to_shared_classes_with_children(
    client: TestClient, db: Session, auth_headers: AuthHeaders, anna, marek, admin
):
    outsider = person(db, auth_headers, "marek.obcy@example.com", "Marek", "Obcy")

    shared_class = make_class(db, anna.id, name="1A")
    other_class = make_class(db, outsider.id, name="2B")
    marek_child = make_child(db, marek.id, first_name="Ala", last_name="Lis")
    make_membership(db, marek_child.id, shared_class.id)
    outsider_child = make_child(db, outsider.id, first_name="Olek", last_name="Obcy")
    make_membership(db, outsider_child.id, other_class.id)
    db.commit()

    def search(q: str) -> list[dict]:
        response = client.get("/api/chats/contacts", params={"q": q}, headers=anna.headers)
        assert response.status_code == 200, response.text
        return response.json()

    results = search("mar")
    assert [f"{user['first_name']} {user['last_name']}" for user in results] == ["Marek Lis"]
    assert results[0]["children"] == ["Ala Lis"]
    assert [f"{user['first_name']} {user['last_name']}" for user in search("marek lis")] == [
        "Marek Lis"
    ]
    assert search("anna") == []  # not myself
    assert search("adam") == []  # not administrators
    assert (
        client.get("/api/chats/contacts", params={"q": "m"}, headers=anna.headers).status_code
        == 422
    )


# ---------------------------------------------------------------------------
# Admin chat
# ---------------------------------------------------------------------------


def test_only_treasurers_can_open_the_admin_chat(client: TestClient, anna):
    response = client.post("/api/chats/admin", headers=anna.headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "Only class treasurers can message the administrator"


def test_treasurer_talks_to_the_administrators(
    client: TestClient, db: Session, auth_headers: AuthHeaders, anna, admin
):
    make_class(db, anna.id)
    other_admin = person(
        db, auth_headers, "admin2@example.com", "Ola", "Admin", role=UserRole.ADMIN
    )

    chat = client.post("/api/chats/admin", headers=anna.headers).json()
    assert chat["kind"] == "ADMIN"
    assert chat["title"] == "Administrator"
    assert client.post("/api/chats/admin", headers=anna.headers).json()["id"] == chat["id"]

    send(client, anna, chat["id"], "The access code does not work")

    # every administrator sees it, titled with the treasurer's name
    for someone in (admin, other_admin):
        [seen] = list_chats(client, someone, kind="ADMIN")
        assert seen["id"] == chat["id"]
        assert seen["title"] == "Anna Nowak"
        assert seen["unread_count"] == 1

    reply = send(client, admin, chat["id"], "Let me check")
    assert reply["sender"]["first_name"] == "Adam"
    [seen_by_anna] = list_chats(client, anna, kind="ADMIN")
    assert seen_by_anna["unread_count"] == 1
    assert seen_by_anna["last_message"]["content"] == "Let me check"
    assert [m["content"] for m in messages(client, anna, chat["id"])["messages"]] == [
        "The access code does not work",
        "Let me check",
    ]


def test_admin_chat_is_private_to_its_treasurer(
    client: TestClient, db: Session, anna, marek, admin
):
    make_class(db, anna.id)
    make_class(db, marek.id, name="2B")
    anna_chat = client.post("/api/chats/admin", headers=anna.headers).json()
    marek_chat = client.post("/api/chats/admin", headers=marek.headers).json()

    assert anna_chat["id"] != marek_chat["id"]
    assert client.get(f"/api/chats/{anna_chat['id']}", headers=marek.headers).status_code == 404
    send(client, anna, anna_chat["id"], "Hello admin")
    send(client, marek, marek_chat["id"], "Hello admin 2")
    assert len(list_chats(client, admin, kind="ADMIN")) == 2
