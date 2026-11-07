import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.chat.enums import ChatKind
from app.modules.chat.models import Chat
from app.modules.classrooms.enums import MembershipStatus
from tests.chat.helpers import Person, list_chats, person, send
from tests.conftest import AuthHeaders
from tests.factories import make_child, make_class, make_membership


@pytest.fixture
def treasurer(db: Session, auth_headers: AuthHeaders) -> Person:
    return person(db, auth_headers, "treasurer@example.com", "Anna", "Nowak")


@pytest.fixture
def school_class(db: Session, treasurer: Person):
    return make_class(db, treasurer.id, name="3B")


def parent_in_class(
    db: Session,
    auth_headers: AuthHeaders,
    school_class,
    email: str = "marek@example.com",
    status: MembershipStatus = MembershipStatus.ACTIVE,
) -> Person:
    parent = person(db, auth_headers, email, "Marek", "Lis")
    make_membership(db, make_child(db, parent.id).id, school_class.id, status)
    return parent


def test_requires_login(client: TestClient):
    assert client.get("/api/chats").status_code == 401


def test_new_user_has_no_chats(client: TestClient, db: Session, auth_headers: AuthHeaders):
    assert list_chats(client, person(db, auth_headers, "x@example.com", "Ewa")) == []


def test_treasurer_and_active_parent_share_the_class_chat(
    client: TestClient, db: Session, auth_headers: AuthHeaders, treasurer, school_class
):
    parent = parent_in_class(db, auth_headers, school_class)

    [mine] = list_chats(client, treasurer)
    [theirs] = list_chats(client, parent)

    assert mine["id"] == theirs["id"]
    assert mine["kind"] == "CLASS"
    assert mine["title"] == "Class 3B"
    assert mine["class_id"] == str(school_class.id)
    assert mine["other_user"] is None
    assert mine["last_message"] is None
    assert mine["unread_count"] == 0


def test_class_chat_is_created_once(
    client: TestClient, db: Session, auth_headers: AuthHeaders, treasurer, school_class
):
    parent_in_class(db, auth_headers, school_class)
    list_chats(client, treasurer)
    list_chats(client, treasurer)

    count = db.scalar(
        select(func.count()).select_from(Chat).where(Chat.class_id == school_class.id)
    )
    assert count == 1


@pytest.mark.parametrize(
    "status",
    [MembershipStatus.PENDING, MembershipStatus.REJECTED, MembershipStatus.LEFT],
)
def test_parent_without_an_active_child_has_no_access(
    client: TestClient, db: Session, auth_headers: AuthHeaders, treasurer, school_class, status
):
    [chat] = list_chats(client, treasurer)
    parent = parent_in_class(db, auth_headers, school_class, status=status)

    assert list_chats(client, parent) == []
    assert client.get(f"/api/chats/{chat['id']}", headers=parent.headers).status_code == 404
    response = client.post(
        f"/api/chats/{chat['id']}/messages", json={"content": "Hi"}, headers=parent.headers
    )
    assert response.status_code == 404


def test_parent_of_a_removed_child_loses_access(
    client: TestClient, db: Session, auth_headers: AuthHeaders, treasurer, school_class
):
    parent = person(db, auth_headers, "marek@example.com", "Marek")
    child = make_child(db, parent.id)
    make_membership(db, child.id, school_class.id)
    assert len(list_chats(client, parent)) == 1

    client.delete(f"/api/children/{child.id}", headers=parent.headers)

    assert list_chats(client, parent) == []


def test_everyone_in_the_class_sees_messages(
    client: TestClient, db: Session, auth_headers: AuthHeaders, treasurer, school_class
):
    marek = parent_in_class(db, auth_headers, school_class, "marek@example.com")
    ewa = parent_in_class(db, auth_headers, school_class, "ewa@example.com")
    [chat] = list_chats(client, treasurer)

    send(client, marek, chat["id"], "Who brings the cake?")

    [seen_by_ewa] = list_chats(client, ewa)
    assert seen_by_ewa["last_message"]["content"] == "Who brings the cake?"
    assert seen_by_ewa["last_message"]["sender"]["first_name"] == "Marek"
    assert seen_by_ewa["unread_count"] == 1
    assert list_chats(client, treasurer)[0]["unread_count"] == 1
    assert list_chats(client, marek)[0]["unread_count"] == 0


def test_each_class_has_its_own_chat(
    client: TestClient, db: Session, auth_headers: AuthHeaders, treasurer, school_class
):
    make_class(db, treasurer.id, name="1A")

    titles = sorted(chat["title"] for chat in list_chats(client, treasurer))
    assert titles == ["Class 1A", "Class 3B"]
    kinds = db.scalars(select(Chat.kind).where(Chat.class_id.is_not(None))).all()
    assert set(kinds) == {ChatKind.CLASS}
