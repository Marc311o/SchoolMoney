import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.chat.helpers import Person, list_chats, messages, open_direct, person, send
from tests.conftest import AuthHeaders


@pytest.fixture
def anna(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "anna@example.com", "Anna", "Nowak")


@pytest.fixture
def marek(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "marek@example.com", "Marek", "Lis")


@pytest.fixture
def chat_id(client: TestClient, anna, marek) -> str:
    return open_direct(client, anna, marek)["id"]


def test_send_message(client: TestClient, anna, chat_id):
    message = send(client, anna, chat_id, "  Hi there  ")

    assert message["chat_id"] == chat_id
    assert message["content"] == "Hi there"
    assert message["sender"]["id"] == str(anna.id)
    assert message["sender"]["first_name"] == "Anna"


@pytest.mark.parametrize(
    "payload",
    [{"content": ""}, {"content": "   "}, {"content": "x" * 2001}, {}],
    ids=["empty", "only spaces", "too long", "missing"],
)
def test_message_validation(client: TestClient, anna, chat_id, payload):
    response = client.post(f"/api/chats/{chat_id}/messages", json=payload, headers=anna.headers)
    assert response.status_code == 422


def test_messages_are_oldest_first(client: TestClient, anna, marek, chat_id):
    send(client, anna, chat_id, "one")
    send(client, marek, chat_id, "two")
    send(client, anna, chat_id, "three")

    page = messages(client, marek, chat_id)
    assert [m["content"] for m in page["messages"]] == ["one", "two", "three"]
    assert page["has_more"] is False


def test_older_messages_page_by_page(client: TestClient, anna, chat_id):
    for number in range(5):
        send(client, anna, chat_id, f"m{number}")

    newest = messages(client, anna, chat_id, limit=2)
    assert [m["content"] for m in newest["messages"]] == ["m3", "m4"]
    assert newest["has_more"] is True

    older = messages(client, anna, chat_id, limit=2, before=newest["messages"][0]["id"])
    assert [m["content"] for m in older["messages"]] == ["m1", "m2"]
    assert older["has_more"] is True

    oldest = messages(client, anna, chat_id, limit=2, before=older["messages"][0]["id"])
    assert [m["content"] for m in oldest["messages"]] == ["m0"]
    assert oldest["has_more"] is False


def test_before_must_be_a_message_of_this_chat(
    client: TestClient, db: Session, auth_headers: AuthHeaders, anna, chat_id
):
    ewa = person(db, auth_headers, "ewa@example.com", "Ewa")
    other_chat = open_direct(client, anna, ewa)["id"]
    foreign = send(client, anna, other_chat)

    response = client.get(
        f"/api/chats/{chat_id}/messages", params={"before": foreign["id"]}, headers=anna.headers
    )
    assert response.status_code == 404


@pytest.mark.parametrize("limit", [0, 101])
def test_limit_bounds(client: TestClient, anna, chat_id, limit):
    response = client.get(
        f"/api/chats/{chat_id}/messages", params={"limit": limit}, headers=anna.headers
    )
    assert response.status_code == 422


def test_unread_until_read(client: TestClient, anna, marek, chat_id):
    send(client, anna, chat_id, "one")
    send(client, anna, chat_id, "two")
    assert list_chats(client, marek)[0]["unread_count"] == 2
    assert list_chats(client, anna)[0]["unread_count"] == 0  # own messages

    response = client.post(f"/api/chats/{chat_id}/read", headers=marek.headers)
    assert response.status_code == 204
    assert list_chats(client, marek)[0]["unread_count"] == 0

    send(client, anna, chat_id, "three")
    assert list_chats(client, marek)[0]["unread_count"] == 1


def test_replying_marks_the_chat_read(client: TestClient, anna, marek, chat_id):
    send(client, anna, chat_id, "question")
    send(client, marek, chat_id, "answer")
    assert list_chats(client, marek)[0]["unread_count"] == 0


def test_list_is_sorted_by_last_activity_and_filtered(
    client: TestClient, db: Session, auth_headers: AuthHeaders, anna, marek, chat_id
):
    ewa = person(db, auth_headers, "ewa@example.com", "Ewa", "Mazur")
    ewa_chat = open_direct(client, anna, ewa)["id"]
    send(client, anna, ewa_chat, "first")
    send(client, anna, chat_id, "later")

    assert [c["title"] for c in list_chats(client, anna)] == ["Marek Lis", "Ewa Mazur"]
    assert [c["title"] for c in list_chats(client, anna, q="maz")] == ["Ewa Mazur"]
    assert list_chats(client, anna, kind="CLASS") == []
    assert len(list_chats(client, anna, kind="DIRECT")) == 2


def test_get_chat_header(client: TestClient, anna, marek, chat_id):
    send(client, marek, chat_id, "Hi")
    response = client.get(f"/api/chats/{chat_id}", headers=anna.headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Marek Lis"
    assert response.json()["unread_count"] == 1
