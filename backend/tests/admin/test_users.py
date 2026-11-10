"""list, search and block parents"""

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.users.enums import UserStatus
from app.modules.users.models import User
from tests.conftest import AuthHeaders
from tests.factories import make_child, make_class

URL = "/api/admin/users"


def account(db: Session, email: str) -> User:
    return db.scalars(select(User).where(User.email == email)).one()


@pytest.fixture
def people(db: Session, auth_headers: AuthHeaders) -> dict[str, dict[str, str]]:
    """Four parents with their own names: a treasurer of two classes, a parent of two
    children (one removed), a blocked parent and one who never activated."""
    names = {
        "anna@example.com": ("Anna", "Nowak"),
        "marek@example.com": ("Marek", "Lis"),
        "ewa@example.com": ("Ewa", "Mazur"),
        "nina@example.com": ("Nina", "Kowal"),
    }
    headers = {}
    for email, (first, last) in names.items():
        headers[email] = auth_headers(email)
        user = account(db, email)
        user.first_name, user.last_name = first, last

    anna, marek = account(db, "anna@example.com"), account(db, "marek@example.com")
    make_class(db, anna.id, name="3B")
    make_class(db, anna.id, name="1A")
    make_child(db, anna.id)
    make_child(db, marek.id)
    make_child(db, marek.id, first_name="Jan").deleted_at = marek.created_at
    account(db, "ewa@example.com").status = UserStatus.BLOCKED
    account(db, "nina@example.com").status = UserStatus.PENDING_ACTIVATION
    db.commit()
    return headers


def emails(response) -> list[str]:
    assert response.status_code == 200, response.text
    return [row["email"] for row in response.json()["items"]]


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


def test_admin_only(client: TestClient, parent):
    target = f"{URL}/{uuid4()}/status"
    assert client.get(URL).status_code == 401
    assert client.get(URL, headers=parent).status_code == 403
    assert client.patch(target, json={"status": "BLOCKED"}).status_code == 401
    assert client.patch(target, json={"status": "BLOCKED"}, headers=parent).status_code == 403


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


def test_lists_parents_by_last_name_without_admins(client: TestClient, admin, people):
    response = client.get(URL, headers=admin)

    assert emails(response) == [
        "nina@example.com",  # Kowal
        "marek@example.com",  # Lis
        "ewa@example.com",  # Mazur
        "anna@example.com",  # Nowak
    ]
    body = response.json()
    assert (body["total"], body["page"], body["page_size"], body["pages"]) == (4, 1, 10, 1)


def test_rows_show_children_and_classes(client: TestClient, admin, people):
    rows = {row["email"]: row for row in client.get(URL, headers=admin).json()["items"]}

    anna, marek = rows["anna@example.com"], rows["marek@example.com"]
    assert [c["name"] for c in anna["classes"]] == ["1A", "3B"]
    assert [c["first_name"] for c in anna["children"]] == ["Ola"]
    assert marek["classes"] == []
    assert len(marek["children"]) == 1  # the removed child (Jan) is not listed
    assert rows["ewa@example.com"]["status"] == "BLOCKED"
    assert "password_hash" not in anna


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("nowak", ["anna@example.com"]),
        ("ANNA NO", ["anna@example.com"]),
        ("marek@", ["marek@example.com"]),
        (
            "example.com",
            ["nina@example.com", "marek@example.com", "ewa@example.com", "anna@example.com"],
        ),
        ("nobody", []),
    ],
)
def test_search_by_name_or_email(client: TestClient, admin, people, q, expected):
    assert emails(client.get(URL, params={"q": q}, headers=admin)) == expected


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("BLOCKED", ["ewa@example.com"]),
        ("PENDING_ACTIVATION", ["nina@example.com"]),
        ("ACTIVE", ["marek@example.com", "anna@example.com"]),
    ],
)
def test_filter_by_status(client: TestClient, admin, people, status, expected):
    assert emails(client.get(URL, params={"status": status}, headers=admin)) == expected


def test_treasurers_only(client: TestClient, admin, people):
    assert emails(client.get(URL, params={"treasurers": True}, headers=admin)) == [
        "anna@example.com"
    ]


def test_pages(client: TestClient, admin, people):
    first = client.get(URL, params={"page_size": 3}, headers=admin).json()
    second = client.get(URL, params={"page_size": 3, "page": 2}, headers=admin).json()

    assert len(first["items"]) == 3
    assert [row["email"] for row in second["items"]] == ["anna@example.com"]
    assert (second["total"], second["pages"]) == (4, 2)


@pytest.mark.parametrize("params", [{"page": 0}, {"page_size": 0}, {"page_size": 101}])
def test_page_bounds(client: TestClient, admin, params):
    assert client.get(URL, params=params, headers=admin).status_code == 422


# ---------------------------------------------------------------------------
# Block and unblock
# ---------------------------------------------------------------------------


def test_block_and_unblock(client: TestClient, db: Session, admin, people):
    marek_id = account(db, "marek@example.com").id
    marek = people["marek@example.com"]
    url = f"{URL}/{marek_id}/status"

    response = client.patch(url, json={"status": "BLOCKED"}, headers=admin)
    assert response.status_code == 200
    assert response.json()["status"] == "BLOCKED"
    assert len(response.json()["children"]) == 1
    assert client.get("/api/users/me", headers=marek).status_code == 403

    response = client.patch(url, json={"status": "ACTIVE"}, headers=admin)
    assert response.json()["status"] == "ACTIVE"
    assert client.get("/api/users/me", headers=marek).status_code == 200


@pytest.mark.parametrize(
    ("who", "body", "expected"),
    [
        ("admin@example.com", {"status": "BLOCKED"}, 403),
        ("nina@example.com", {"status": "BLOCKED"}, 409),
        ("nina@example.com", {"status": "ACTIVE"}, 409),
        ("marek@example.com", {"status": "PENDING_ACTIVATION"}, 422),
        ("marek@example.com", {"status": "DELETED"}, 422),
        ("marek@example.com", {}, 422),
    ],
    ids=["an admin", "not activated", "activate by unblocking", "pending", "unknown", "missing"],
)
def test_block_refused(client: TestClient, db: Session, admin, people, who, body, expected):
    url = f"{URL}/{account(db, who).id}/status"
    assert client.patch(url, json=body, headers=admin).status_code == expected


def test_block_unknown_user(client: TestClient, admin):
    response = client.patch(f"{URL}/{uuid4()}/status", json={"status": "BLOCKED"}, headers=admin)
    assert response.status_code == 404
