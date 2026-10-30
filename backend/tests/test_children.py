from datetime import date, timedelta
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.models import FundraiserObligation
from tests.conftest import AuthHeaders
from tests.factories import (
    make_class,
    make_fundraiser,
    make_membership,
    make_obligation,
    make_payment,
)

CHILD = {"first_name": "Ola", "last_name": "Kot", "birth_date": "2018-05-04"}


def add_child(client: TestClient, headers: dict[str, str], **overrides) -> dict:
    """Create a child through the API and return the response body."""
    response = client.post("/api/children", json={**CHILD, **overrides}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def child_in_class(
    client: TestClient,
    db: Session,
    headers: dict[str, str],
    status: MembershipStatus = MembershipStatus.ACTIVE,
) -> tuple[dict, SchoolClass]:
    """A new child already placed in a new class."""
    child = add_child(client, headers)
    child_id = UUID(child["id"])
    school_class = make_class(db, treasurer_id=db.get(Child, child_id).parent_id)
    make_membership(db, child_id, school_class.id, status)
    return child, school_class


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


def test_requires_login(client: TestClient):
    assert client.get("/api/children").status_code == 401


def test_list_is_empty_for_a_new_parent(client: TestClient, parent):
    response = client.get("/api/children", headers=parent)
    assert response.status_code == 200
    assert response.json() == []


def test_parent_sees_only_own_children(client: TestClient, parent, auth_headers: AuthHeaders):
    other = auth_headers("other@example.com")
    add_child(client, parent)
    foreign = add_child(client, other, first_name="Jan")

    names = [child["first_name"] for child in client.get("/api/children", headers=parent).json()]
    assert names == ["Ola"]
    assert client.get(f"/api/children/{foreign['id']}", headers=parent).status_code == 404
    assert (
        client.patch(
            f"/api/children/{foreign['id']}", json={"first_name": "X"}, headers=parent
        ).status_code
        == 404
    )
    assert client.delete(f"/api/children/{foreign['id']}", headers=parent).status_code == 404


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


def test_create_child(client: TestClient, parent):
    me = client.get("/api/auth/me", headers=parent).json()
    child = add_child(client, parent)

    assert child["parent_id"] == me["id"]
    assert child["first_name"] == "Ola"
    assert child["birth_date"] == "2018-05-04"
    assert child["avatar_url"] is None
    assert child["removed"] is False
    assert child["school_class"] is None
    assert "deleted_at" not in child


@pytest.mark.parametrize(
    "payload",
    [
        {**CHILD, "birth_date": (date.today() + timedelta(days=1)).isoformat()},
        {"first_name": "Ola", "last_name": "Kot"},
        {**CHILD, "first_name": ""},
        {**CHILD, "parent_id": str(uuid4())},
    ],
    ids=["future birth date", "missing birth date", "empty name", "parent_id in body"],
)
def test_create_child_validation(client: TestClient, parent, payload):
    assert client.post("/api/children", json=payload, headers=parent).status_code == 422


def test_adding_a_removed_child_again_restores_it(client: TestClient, parent):
    child = add_child(client, parent)
    client.delete(f"/api/children/{child['id']}", headers=parent)

    restored = add_child(client, parent, first_name="OLA", avatar_url="https://example.com/a.png")

    assert restored["id"] == child["id"]
    assert restored["first_name"] == "OLA"
    assert restored["avatar_url"] == "https://example.com/a.png"
    assert restored["removed"] is False
    assert restored["school_class"] is None


def test_different_birth_date_creates_a_new_child(client: TestClient, parent):
    child = add_child(client, parent)
    client.delete(f"/api/children/{child['id']}", headers=parent)

    new = add_child(client, parent, birth_date="2019-01-01")
    assert new["id"] != child["id"]


# ---------------------------------------------------------------------------
# Read and update
# ---------------------------------------------------------------------------


def test_get_child_shows_current_class(client: TestClient, db: Session, parent):
    child, school_class = child_in_class(client, db, parent, MembershipStatus.PENDING)

    body = client.get(f"/api/children/{child['id']}", headers=parent).json()
    assert body["school_class"] == {
        "id": str(school_class.id),
        "name": "1A",
        "status": "PENDING",
    }


def test_update_changes_only_sent_fields(client: TestClient, parent):
    child = add_child(client, parent)

    response = client.patch(
        f"/api/children/{child['id']}", json={"first_name": "Aleksandra"}, headers=parent
    )
    assert response.status_code == 200
    assert response.json()["first_name"] == "Aleksandra"
    assert response.json()["last_name"] == "Kot"
    assert response.json()["birth_date"] == "2018-05-04"


def test_update_can_clear_avatar(client: TestClient, parent):
    child = add_child(client, parent, avatar_url="https://example.com/a.png")

    response = client.patch(
        f"/api/children/{child['id']}", json={"avatar_url": None}, headers=parent
    )
    assert response.json()["avatar_url"] is None


@pytest.mark.parametrize(
    "payload",
    [{"birth_date": None}, {"first_name": None}, {"parent_id": str(uuid4())}],
    ids=["null birth date", "null name", "parent_id"],
)
def test_update_validation(client: TestClient, parent, payload):
    child = add_child(client, parent)
    response = client.patch(f"/api/children/{child['id']}", json=payload, headers=parent)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Remove
# ---------------------------------------------------------------------------


def test_remove_child(client: TestClient, db: Session, parent):
    child = add_child(client, parent)

    assert client.delete(f"/api/children/{child['id']}", headers=parent).status_code == 204
    assert client.get(f"/api/children/{child['id']}", headers=parent).status_code == 404
    assert client.get("/api/children", headers=parent).json() == []
    # Still in the database for history
    assert db.get(Child, UUID(child["id"])).deleted_at is not None


def test_remove_leaves_class_and_drops_open_obligations(client: TestClient, db: Session, parent):
    child, school_class = child_in_class(client, db, parent)
    active = make_fundraiser(db, school_class, FundraiserStatus.ACTIVE)
    closed = make_fundraiser(db, school_class, FundraiserStatus.CLOSED)
    make_obligation(db, active, UUID(child["id"]))
    make_obligation(db, closed, UUID(child["id"]))

    assert client.delete(f"/api/children/{child['id']}", headers=parent).status_code == 204

    membership = db.scalar(
        select(ChildClassMembership).where(ChildClassMembership.child_id == UUID(child["id"]))
    )
    assert membership.status == MembershipStatus.LEFT
    assert membership.left_at is not None
    remaining = db.scalars(
        select(FundraiserObligation.fundraiser_id).where(
            FundraiserObligation.child_id == UUID(child["id"])
        )
    ).all()
    assert remaining == [closed.id]  # closed fundraisers keep their history


def test_remove_is_blocked_by_payment_in_open_fundraiser(client: TestClient, db: Session, parent):
    child, school_class = child_in_class(client, db, parent)
    make_payment(db, make_fundraiser(db, school_class, FundraiserStatus.ACTIVE), UUID(child["id"]))

    response = client.delete(f"/api/children/{child['id']}", headers=parent)
    assert response.status_code == 409
    assert "Trip (ACTIVE)" in response.json()["detail"]
    assert client.get(f"/api/children/{child['id']}", headers=parent).status_code == 200


@pytest.mark.parametrize(
    ("fundraiser_status", "refunded"),
    [(FundraiserStatus.CLOSED, False), (FundraiserStatus.ACTIVE, True)],
    ids=["closed fundraiser", "refunded payment"],
)
def test_remove_is_allowed_after_payment_is_settled(
    client: TestClient, db: Session, parent, fundraiser_status, refunded
):
    child, school_class = child_in_class(client, db, parent)
    fundraiser = make_fundraiser(db, school_class, fundraiser_status)
    make_payment(db, fundraiser, UUID(child["id"]), refunded=refunded)

    assert client.delete(f"/api/children/{child['id']}", headers=parent).status_code == 204
