from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import SchoolClass
from app.modules.users.models import User
from tests.conftest import AuthHeaders
from tests.factories import make_child, make_class, make_membership


def user_id(db: Session, email: str) -> UUID:
    return db.scalars(select(User.id).where(User.email == email)).one()


class School:
    """Class 3B run by a treasurer, with one other family in it.

    treasurer  runs 3B and has no child there
    parent     has Zosia (ACTIVE) in 3B
    stranger   has no child in 3B
    """

    def __init__(self, db: Session, auth_headers: AuthHeaders):
        self.db = db
        self.treasurer = auth_headers("treasurer@example.com")
        self.parent = auth_headers("parent@example.com")
        self.stranger = auth_headers("stranger@example.com")

        self.parent_id = user_id(db, "parent@example.com")
        self.school_class = make_class(
            db, user_id(db, "treasurer@example.com"), name="3B", school_name="SP nr 12"
        )
        self.zosia = self.add_child(self.parent_id, "Zosia", "Nowak", MembershipStatus.ACTIVE)

    def add_child(
        self,
        parent_id: UUID,
        first_name: str,
        last_name: str = "Kot",
        status: MembershipStatus = MembershipStatus.ACTIVE,
        school_class: SchoolClass | None = None,
    ):
        child = make_child(self.db, parent_id, first_name, last_name)
        make_membership(self.db, child.id, (school_class or self.school_class).id, status)
        return child


@pytest.fixture
def school(db: Session, auth_headers: AuthHeaders) -> School:
    return School(db, auth_headers)


def get_classes(client: TestClient, headers: dict[str, str]) -> list[dict]:
    response = client.get("/api/classes", headers=headers)
    assert response.status_code == 200
    return response.json()


def get_class(client: TestClient, headers: dict[str, str], class_id) -> dict:
    response = client.get(f"/api/classes/{class_id}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


def test_requires_login(client: TestClient):
    assert client.get("/api/classes").status_code == 401
    assert client.get(f"/api/classes/{uuid4()}").status_code == 401


# ---------------------------------------------------------------------------
# GET /classes
# ---------------------------------------------------------------------------


def test_treasurer_sees_own_class(client: TestClient, school: School):
    [item] = get_classes(client, school.treasurer)

    assert item["id"] == str(school.school_class.id)
    assert item["name"] == "3B"
    assert item["school_name"] == "SP nr 12"
    assert item["treasurer_id"] == item["treasurer"]["id"]
    assert item["my_children"] == []
    assert item["children_count"] == 1


def test_parent_sees_class_of_their_child(client: TestClient, school: School):
    [item] = get_classes(client, school.parent)

    assert item["my_role"] == "PARENT"
    assert item["treasurer"]["id"] == str(school.school_class.treasurer_id)
    assert "email" not in item["treasurer"]
    [membership] = item["my_children"]
    assert membership["status"] == "ACTIVE"
    assert membership["class_id"] == str(school.school_class.id)
    assert membership["child"]["id"] == str(school.zosia.id)
    assert membership["child"]["first_name"] == "Zosia"


def test_parent_with_pending_child_sees_class_as_waiting(
    client: TestClient, school: School, db: Session
):
    school.add_child(user_id(db, "stranger@example.com"), "Jan", status=MembershipStatus.PENDING)

    [item] = get_classes(client, school.stranger)
    assert item["my_children"][0]["status"] == "PENDING"
    assert item["children_count"] == 1  # pending children are not counted


def test_stranger_sees_no_classes(client: TestClient, school: School):
    assert get_classes(client, school.stranger) == []


@pytest.mark.parametrize("status", [MembershipStatus.LEFT, MembershipStatus.REJECTED])
def test_finished_membership_hides_class(
    client: TestClient, school: School, db: Session, status: MembershipStatus
):
    school.add_child(user_id(db, "stranger@example.com"), "Jan", status=status)
    assert get_classes(client, school.stranger) == []


def test_removed_child_hides_class(client: TestClient, school: School):
    school.zosia.deleted_at = datetime.now(UTC)
    school.db.flush()

    assert get_classes(client, school.parent) == []
    assert get_classes(client, school.treasurer)[0]["children_count"] == 0


def test_treasurer_with_own_child_is_treasurer(client: TestClient, school: School, db: Session):
    school.add_child(user_id(db, "treasurer@example.com"), "Staś")

    [item] = get_classes(client, school.treasurer)
    assert item["my_role"] == "TREASURER"
    assert [entry["child"]["first_name"] for entry in item["my_children"]] == ["Staś"]
    assert item["children_count"] == 2


def test_parent_with_children_in_two_classes(client: TestClient, school: School, db: Session):
    other_class = make_class(db, user_id(db, "stranger@example.com"), name="1A")
    school.add_child(school.parent_id, "Kuba", "Nowak", school_class=other_class)

    names = [item["name"] for item in get_classes(client, school.parent)]
    assert names == ["1A", "3B"]


# ---------------------------------------------------------------------------
# GET /classes/{id}
# ---------------------------------------------------------------------------


def test_parent_sees_class_details(client: TestClient, school: School, db: Session):
    other = school.add_child(user_id(db, "stranger@example.com"), "Adam", "Adamski")

    body = get_class(client, school.parent, school.school_class.id)

    assert body["name"] == "3B"
    assert body["my_role"] == "PARENT"
    assert body["treasurer"]["id"] == str(school.school_class.treasurer_id)
    # Sorted by the child's last name, each child with its parent
    assert [entry["child"]["first_name"] for entry in body["children"]] == ["Adam", "Zosia"]
    adam, zosia = body["children"]
    assert adam["child"]["id"] == str(other.id)
    assert adam["parent"]["id"] == str(other.parent_id)
    assert zosia["parent"]["id"] == str(school.parent_id)
    assert zosia["status"] == "ACTIVE"
    assert zosia["joined_at"] is not None
    assert "birth_date" not in zosia["child"]
    assert "email" not in zosia["parent"]


def test_only_treasurer_sees_pending_children(client: TestClient, school: School, db: Session):
    school.add_child(user_id(db, "stranger@example.com"), "Jan", status=MembershipStatus.PENDING)

    as_treasurer = get_class(client, school.treasurer, school.school_class.id)
    as_parent = get_class(client, school.parent, school.school_class.id)

    assert as_treasurer["my_role"] == "TREASURER"
    assert sorted(entry["status"] for entry in as_treasurer["children"]) == ["ACTIVE", "PENDING"]
    assert [entry["status"] for entry in as_parent["children"]] == ["ACTIVE"]


def test_finished_and_removed_children_are_not_listed(
    client: TestClient, school: School, db: Session
):
    stranger_id = user_id(db, "stranger@example.com")
    school.add_child(stranger_id, "Left", status=MembershipStatus.LEFT)
    school.add_child(stranger_id, "Rejected", status=MembershipStatus.REJECTED)
    removed = school.add_child(stranger_id, "Removed")
    removed.deleted_at = datetime.now(UTC)
    db.flush()

    body = get_class(client, school.treasurer, school.school_class.id)
    assert [entry["child"]["first_name"] for entry in body["children"]] == ["Zosia"]


@pytest.mark.parametrize(
    "status",
    [None, MembershipStatus.PENDING, MembershipStatus.LEFT, MembershipStatus.REJECTED],
    ids=["no child", "pending", "left", "rejected"],
)
def test_class_details_are_hidden_from_non_members(
    client: TestClient, school: School, db: Session, status
):
    if status is not None:
        school.add_child(user_id(db, "stranger@example.com"), "Jan", status=status)

    response = client.get(f"/api/classes/{school.school_class.id}", headers=school.stranger)
    assert response.status_code == 404
    assert response.json()["detail"] == "Class not found"


def test_removed_child_loses_access(client: TestClient, school: School):
    school.zosia.deleted_at = datetime.now(UTC)
    school.db.flush()

    response = client.get(f"/api/classes/{school.school_class.id}", headers=school.parent)
    assert response.status_code == 404


def test_unknown_class_is_404(client: TestClient, parent):
    assert client.get(f"/api/classes/{uuid4()}", headers=parent).status_code == 404
