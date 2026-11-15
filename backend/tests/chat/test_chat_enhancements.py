from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.chat.models import Message
from app.modules.classrooms.enums import MembershipStatus
from tests.chat.helpers import list_chats, messages, open_direct, person, send
from tests.conftest import AuthHeaders
from tests.factories import make_child, make_class, make_membership


def test_filter_chats_by_message_content(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    anna = person(db, auth_headers, "anna@example.com", "Anna", "Nowak")
    marek = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    ewa = person(db, auth_headers, "ewa@example.com", "Ewa", "Mazur")

    chat_marek = open_direct(client, anna, marek)["id"]
    chat_ewa = open_direct(client, anna, ewa)["id"]

    send(client, anna, chat_marek, "Remember about the theatre tickets tomorrow")
    send(client, anna, chat_ewa, "See you at the playground")

    by_content = list_chats(client, anna, q="theatre")
    assert [c["title"] for c in by_content] == ["Marek Lis"]

    # Deleted messages are no longer matched by content search
    msg = send(client, anna, chat_ewa, "secret keyword")
    assert len(list_chats(client, anna, q="secret keyword")) == 1

    del_resp = client.delete(f"/api/chats/{chat_ewa}/messages/{msg['id']}", headers=anna.headers)
    assert del_resp.status_code == 204
    assert list_chats(client, anna, q="secret keyword") == []


def test_author_can_edit_and_delete_own_message_within_window(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    anna = person(db, auth_headers, "anna@example.com", "Anna", "Nowak")
    marek = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    chat_id = open_direct(client, anna, marek)["id"]

    msg = send(client, anna, chat_id, "Original text")
    assert msg["edited_at"] is None
    assert msg["deleted_at"] is None

    # Marek cannot edit or delete Anna's message in a direct chat
    assert (
        client.patch(
            f"/api/chats/{chat_id}/messages/{msg['id']}",
            json={"content": "Hacked"},
            headers=marek.headers,
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/chats/{chat_id}/messages/{msg['id']}", headers=marek.headers
        ).status_code
        == 403
    )

    # Anna edits her message
    edited = client.patch(
        f"/api/chats/{chat_id}/messages/{msg['id']}",
        json={"content": "Updated text"},
        headers=anna.headers,
    )
    assert edited.status_code == 200
    assert edited.json()["content"] == "Updated text"
    assert edited.json()["edited_at"] is not None

    # Anna deletes her message
    deleted = client.delete(f"/api/chats/{chat_id}/messages/{msg['id']}", headers=anna.headers)
    assert deleted.status_code == 204

    history = messages(client, anna, chat_id)["messages"]
    assert history[0]["content"] == ""
    assert history[0]["deleted_at"] is not None

    # Cannot edit or delete an already deleted message
    assert (
        client.patch(
            f"/api/chats/{chat_id}/messages/{msg['id']}",
            json={"content": "Again"},
            headers=anna.headers,
        ).status_code
        == 409
    )


def test_author_cannot_edit_or_delete_after_timespan_expires(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    anna = person(db, auth_headers, "anna@example.com", "Anna", "Nowak")
    marek = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    chat_id = open_direct(client, anna, marek)["id"]

    msg = send(client, anna, chat_id, "Old message")
    db_msg = db.get(Message, UUID(msg["id"]))
    db_msg.created_at = datetime.now(UTC) - timedelta(minutes=20)
    db.commit()

    assert (
        client.patch(
            f"/api/chats/{chat_id}/messages/{msg['id']}",
            json={"content": "Too late"},
            headers=anna.headers,
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/chats/{chat_id}/messages/{msg['id']}", headers=anna.headers
        ).status_code
        == 403
    )


def test_treasurer_can_moderate_any_message_in_class_chat(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    treasurer = person(db, auth_headers, "treasurer@example.com", "Anna", "Nowak")
    parent = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    school_class = make_class(db, treasurer.id, name="4A")
    make_membership(db, make_child(db, parent.id).id, school_class.id, MembershipStatus.ACTIVE)

    [chat] = list_chats(client, treasurer)
    msg = send(client, parent, chat["id"], "Inappropriate message")

    # Even after 2 hours, treasurer can delete parent's message in class chat
    db_msg = db.get(Message, UUID(msg["id"]))
    db_msg.created_at = datetime.now(UTC) - timedelta(hours=2)
    db.commit()

    resp = client.delete(f"/api/chats/{chat['id']}/messages/{msg['id']}", headers=treasurer.headers)
    assert resp.status_code == 204


def test_participants_include_last_read_at_for_seen_by(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    anna = person(db, auth_headers, "anna@example.com", "Anna", "Nowak")
    marek = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    chat_id = open_direct(client, anna, marek)["id"]

    send(client, anna, chat_id, "Did you see this?")

    chat_before = client.get(f"/api/chats/{chat_id}", headers=anna.headers).json()
    receipts_before = {p["user"]["id"]: p["last_read_at"] for p in chat_before["participants"]}
    assert receipts_before[str(anna.id)] is not None
    assert receipts_before[str(marek.id)] is None

    client.post(f"/api/chats/{chat_id}/read", headers=marek.headers)

    chat_after = client.get(f"/api/chats/{chat_id}", headers=anna.headers).json()
    receipts_after = {p["user"]["id"]: p["last_read_at"] for p in chat_after["participants"]}
    assert receipts_after[str(marek.id)] is not None


def test_system_notifications_posted_on_member_join_and_fundraiser_lifecycle(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    treasurer = person(db, auth_headers, "treasurer@example.com", "Anna", "Nowak")
    parent = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    school_class = make_class(db, treasurer.id, name="5C")
    child = make_child(db, parent.id, first_name="Ola", last_name="Lis")
    membership = make_membership(db, child.id, school_class.id, MembershipStatus.PENDING)

    # 1. Approving join request posts system message
    approve_resp = client.patch(
        f"/api/classes/{school_class.id}/memberships/{membership.id}",
        json={"status": "ACTIVE"},
        headers=treasurer.headers,
    )
    assert approve_resp.status_code == 200

    # 2. Creating a fundraiser posts system message
    create_fr = client.post(
        "/api/fundraisers",
        json={
            "class_id": str(school_class.id),
            "name": "Theatre trip",
            "required_amount_per_child": "45.00",
            "start_date": "2026-11-15",
            "end_date": "2026-11-30",
        },
        headers=treasurer.headers,
    )
    assert create_fr.status_code == 201
    fundraiser_id = create_fr.json()["id"]

    # 3. Closing a fundraiser posts system message
    close_fr = client.post(
        f"/api/fundraisers/{fundraiser_id}/close",
        headers=treasurer.headers,
    )
    assert close_fr.status_code == 200

    [chat] = list_chats(client, treasurer)
    chat_messages = messages(client, treasurer, chat["id"])["messages"]
    system_texts = [m["content"] for m in chat_messages if m["is_system"]]

    assert system_texts == [
        "Ola Lis joined the class",
        "Treasurer started a fundraiser: Theatre trip",
        "Treasurer closed fundraiser: Theatre trip",
    ]
    assert all(m["sender"] is None for m in chat_messages if m["is_system"])


def test_websocket_endpoint_authentication_and_live_messages(
    client: TestClient, db: Session, auth_headers: AuthHeaders
):
    anna = person(db, auth_headers, "anna@example.com", "Anna", "Nowak")
    marek = person(db, auth_headers, "marek@example.com", "Marek", "Lis")
    chat_id = open_direct(client, anna, marek)["id"]

    marek_token = marek.headers["Authorization"].split(" ", 1)[1]

    with client.websocket_connect(f"/api/chats/ws?token={marek_token}") as ws:
        ws.send_text("ping")
        assert ws.receive_text() == "pong"

        sent = send(client, anna, chat_id, "Live message via WS")
        event = ws.receive_json()

        assert event["type"] == "message.created"
        assert event["chat_id"] == chat_id
        assert event["message"]["id"] == sent["id"]
        assert event["message"]["content"] == "Live message via WS"
