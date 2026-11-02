from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership
from app.modules.fundraisers.models import FundraiserObligation, FundraiserPayment
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from tests.factories import (
    make_child,
    make_class,
    make_fundraiser,
    make_membership,
    make_obligation,
    make_payment,
)


@pytest.fixture
def school(db, auth_headers):
    headers = {
        role: auth_headers(f"{role}@example.com")
        for role in ("treasurer", "parent", "other_parent", "admin")
    }

    users = {user.email.split("@")[0]: user for user in db.scalars(select(User)).all()}
    users["admin"].role = UserRole.ADMIN

    school_class = make_class(db, users["treasurer"].id)
    other_class = make_class(db, users["other_parent"].id, name="2B")

    child = make_child(db, users["parent"].id)
    other_child = make_child(
        db,
        users["other_parent"].id,
        first_name="Jan",
    )

    membership = make_membership(db, child.id, school_class.id)
    other_membership = make_membership(db, other_child.id, school_class.id)
    db.commit()

    return SimpleNamespace(
        headers=headers,
        users=users,
        school_class=school_class,
        other_class=other_class,
        child=child,
        membership=membership,
        other_membership=other_membership,
        url=f"/api/classes/{school_class.id}/memberships/{membership.id}/remove",
    )


@pytest.mark.parametrize("role", ["treasurer", "parent"])
@pytest.mark.parametrize(
    "membership_status",
    [MembershipStatus.ACTIVE, MembershipStatus.PENDING],
)
def test_authorized_user_removes_membership(client, db, school, role, membership_status):
    school.membership.status = membership_status

    if membership_status == MembershipStatus.PENDING:
        school.membership.joined_at = None

    db.commit()
    joined_at = school.membership.joined_at

    response = client.post(school.url, headers=school.headers[role])

    assert response.status_code == 200
    assert response.json()["id"] == str(school.membership.id)
    assert response.json()["status"] == "LEFT"
    assert response.json()["left_at"] is not None

    db.refresh(school.membership)
    assert school.membership.status == MembershipStatus.LEFT
    assert school.membership.joined_at == joined_at
    assert db.get(Child, school.child.id).deleted_at is None

    db.refresh(school.other_membership)
    assert school.other_membership.status == MembershipStatus.ACTIVE


def test_treasurer_can_remove_own_child_and_remains_treasurer(client, db, school):
    child = make_child(db, school.users["treasurer"].id)
    membership = make_membership(db, child.id, school.school_class.id)
    db.commit()

    url = f"/api/classes/{school.school_class.id}/memberships/{membership.id}/remove"
    headers = school.headers["treasurer"]

    assert client.post(url, headers=headers).status_code == 200

    detail = client.get(
        f"/api/classes/{school.school_class.id}",
        headers=headers,
    )
    assert detail.status_code == 200
    assert detail.json()["my_role"] == "TREASURER"


@pytest.mark.parametrize("role", ["other_parent", "admin"])
def test_non_owner_cannot_remove_membership(client, db, school, role):
    # other_parent also runs another class.
    response = client.post(school.url, headers=school.headers[role])

    assert response.status_code == 404

    db.refresh(school.membership)
    assert school.membership.status == MembershipStatus.ACTIVE
    assert school.membership.left_at is None


def test_stranger_cannot_remove_membership(client, db, school, auth_headers):
    headers = auth_headers("stranger@example.com")
    response = client.post(school.url, headers=headers)

    assert response.status_code == 404

    db.refresh(school.membership)
    assert school.membership.status == MembershipStatus.ACTIVE


@pytest.mark.parametrize(
    "headers",
    [{}, {"Authorization": "Bearer invalid-token"}],
)
def test_requires_valid_login(client, headers):
    url = f"/api/classes/{uuid4()}/memberships/{uuid4()}/remove"

    assert client.post(url, headers=headers).status_code == 401


@pytest.mark.parametrize(
    "case",
    ["missing_class", "missing_membership", "wrong_class"],
)
def test_membership_must_belong_to_requested_class(client, db, school, case):
    class_id = school.school_class.id
    membership_id = school.membership.id
    headers = school.headers["treasurer"]

    if case == "missing_class":
        class_id = uuid4()
    elif case == "missing_membership":
        membership_id = uuid4()
    else:
        class_id = school.other_class.id
        headers = school.headers["other_parent"]

    url = f"/api/classes/{class_id}/memberships/{membership_id}/remove"

    assert client.post(url, headers=headers).status_code == 404

    db.refresh(school.membership)
    assert school.membership.status == MembershipStatus.ACTIVE


@pytest.mark.parametrize("role", ["treasurer", "parent"])
def test_rejected_membership_is_not_changed(client, db, school, role):
    school.membership.status = MembershipStatus.REJECTED
    school.membership.joined_at = None
    db.commit()

    response = client.post(school.url, headers=school.headers[role])

    assert response.status_code == 409

    db.refresh(school.membership)
    assert school.membership.status == MembershipStatus.REJECTED
    assert school.membership.left_at is None


def test_retry_preserves_timestamp_and_new_class_membership(client, db, school):
    headers = school.headers["parent"]

    first = client.post(school.url, headers=headers)
    assert first.status_code == 200

    new_membership = make_membership(
        db,
        school.child.id,
        school.other_class.id,
    )
    db.commit()

    second = client.post(school.url, headers=headers)

    assert second.status_code == 200
    assert second.json() == first.json()

    db.refresh(new_membership)
    assert new_membership.status == MembershipStatus.ACTIVE


@pytest.mark.parametrize("role", ["treasurer", "parent"])
def test_removal_updates_class_views_without_deleting_child(client, school, role):
    response = client.post(school.url, headers=school.headers[role])
    assert response.status_code == 200

    parent_headers = school.headers["parent"]

    classes = client.get("/api/classes", headers=parent_headers)
    assert classes.json() == []

    detail = client.get(
        f"/api/classes/{school.school_class.id}",
        headers=parent_headers,
    )
    assert detail.status_code == 404

    child = client.get(
        f"/api/children/{school.child.id}",
        headers=parent_headers,
    )
    assert child.status_code == 200
    assert child.json()["school_class"] is None

    treasurer_headers = school.headers["treasurer"]

    detail = client.get(
        f"/api/classes/{school.school_class.id}",
        headers=treasurer_headers,
    )
    assert [item["id"] for item in detail.json()["children"]] == [str(school.other_membership.id)]

    classes = client.get("/api/classes", headers=treasurer_headers)
    assert classes.json()[0]["children_count"] == 1


def test_parent_keeps_class_access_if_another_child_remains(client, db, school):
    child = make_child(
        db,
        school.users["parent"].id,
        first_name="Maja",
    )
    make_membership(db, child.id, school.school_class.id)
    db.commit()

    headers = school.headers["parent"]

    assert client.post(school.url, headers=headers).status_code == 200

    detail = client.get(
        f"/api/classes/{school.school_class.id}",
        headers=headers,
    )
    assert detail.status_code == 200


@pytest.mark.parametrize("role", ["treasurer", "parent"])
def test_removal_preserves_financial_records(client, db, school, role):
    fundraiser = make_fundraiser(db, school.school_class)
    obligation = make_obligation(db, fundraiser, school.child.id)
    payment = make_payment(db, fundraiser, school.child.id)
    db.commit()

    obligation_id = obligation.id
    payment_id = payment.id

    response = client.post(school.url, headers=school.headers[role])

    assert response.status_code == 200
    assert db.get(FundraiserObligation, obligation_id) is not None
    assert db.get(FundraiserPayment, payment_id) is not None
    assert db.get(FundraiserPayment, payment_id).refunded_at is None
    assert db.get(ChildClassMembership, school.membership.id) is not None


def test_blocked_treasurer_cannot_remove_membership(client, db, school):
    school.users["treasurer"].status = UserStatus.BLOCKED
    db.commit()

    response = client.post(
        school.url,
        headers=school.headers["treasurer"],
    )

    assert response.status_code == 403

    db.refresh(school.membership)
    assert school.membership.status == MembershipStatus.ACTIVE
