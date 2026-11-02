from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ClassAccessCode, SchoolClass
from app.modules.users.models import User
from tests.conftest import AuthHeaders


def _create_child(
    db: Session,
    parent_id,
    first_name="Kacper",
    last_name="Nowak",
    birth_date=None,
) -> Child:
    child = Child(
        id=uuid4(),
        parent_id=parent_id,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date or date(2018, 5, 12),
    )
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


def _setup_class_with_code(
    db: Session, treasurer: User, valid_until=None, active=True
) -> tuple[SchoolClass, ClassAccessCode]:
    school_class = SchoolClass(
        id=uuid4(),
        name="Class 1A",
        school_name="Primary School 15",
        treasurer_id=treasurer.id,
    )
    db.add(school_class)
    db.flush()

    code = ClassAccessCode(
        id=uuid4(),
        class_id=school_class.id,
        code=f"CODE_{uuid4().hex[:8]}",
        valid_until=valid_until,
        active=active,
    )
    db.add(code)
    db.commit()
    db.refresh(school_class)
    db.refresh(code)
    return school_class, code


def test_join_class_success(client: TestClient, parent, auth_headers: AuthHeaders, db: Session):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()

    # Create treasurer via auth_headers fixture
    auth_headers("treasurer_succ@example.com")
    treasurer = db.scalars(select(User).where(User.email == "treasurer_succ@example.com")).one()

    school_class, code = _setup_class_with_code(db, treasurer)
    child = _create_child(db, parent_user.id)

    response = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["child_id"] == str(child.id)
    assert data["class_id"] == str(school_class.id)
    assert data["status"] == MembershipStatus.PENDING.value


def test_join_class_invalid_or_expired_code(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()
    child = _create_child(db, parent_user.id)

    # 1. Non-existent code -> 404
    res_unknown = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": "NON_EXISTING", "child_id": str(child.id)},
    )
    assert res_unknown.status_code == 404
    assert res_unknown.json()["detail"] == "Invalid or expired access code"

    # 2. Expired code -> 404
    auth_headers("treasurer_exp@example.com")
    treasurer = db.scalars(select(User).where(User.email == "treasurer_exp@example.com")).one()

    _, expired_code = _setup_class_with_code(
        db, treasurer, valid_until=datetime.now(UTC) - timedelta(minutes=5)
    )

    res_expired = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": expired_code.code, "child_id": str(child.id)},
    )
    assert res_expired.status_code == 404
    assert res_expired.json()["detail"] == "Invalid or expired access code"


def test_join_class_child_not_owned(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    auth_headers("other.parent@example.com")
    other_parent = db.scalars(select(User).where(User.email == "other.parent@example.com")).one()

    _, code = _setup_class_with_code(db, other_parent)
    other_child = _create_child(db, other_parent.id)

    response = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(other_child.id)},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Child not found"


def test_join_class_conflict_already_pending_or_active(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()

    auth_headers("treasurer_conf@example.com")
    treasurer = db.scalars(select(User).where(User.email == "treasurer_conf@example.com")).one()

    _, code = _setup_class_with_code(db, treasurer)
    child = _create_child(db, parent_user.id)

    # Initial join request -> 201 Created
    res1 = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )
    assert res1.status_code == 201

    # Duplicate join request for the same class -> 409 Conflict
    res2 = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )
    assert res2.status_code == 409
    assert res2.json()["detail"] == "Join request is already pending"


def test_review_membership_approve_and_reject(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()

    treasurer_headers = auth_headers("treasurer_appr@example.com")
    treasurer = db.scalars(select(User).where(User.email == "treasurer_appr@example.com")).one()

    school_class, code = _setup_class_with_code(db, treasurer)
    child = _create_child(db, parent_user.id, first_name="Sophie")

    # 1. Parent submits a join request (PENDING)
    join_res = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )
    assert join_res.status_code == 201
    membership_id = join_res.json()["id"]

    # 2. A non-treasurer parent attempts to review -> 404 Not Found
    non_treasurer_res = client.patch(
        f"/api/classes/{school_class.id}/members/{membership_id}",
        headers=parent,
        json={"status": "ACTIVE"},
    )
    assert non_treasurer_res.status_code == 404

    # 3. Class treasurer approves the request (ACTIVE) -> 200 OK
    approve_res = client.patch(
        f"/api/classes/{school_class.id}/members/{membership_id}",
        headers=treasurer_headers,
        json={"status": "ACTIVE"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == MembershipStatus.ACTIVE.value
    assert approve_res.json()["joined_at"] is not None

    # 4. Attempting to review an already processed membership -> 409 Conflict
    repeat_res = client.patch(
        f"/api/classes/{school_class.id}/members/{membership_id}",
        headers=treasurer_headers,
        json={"status": "REJECTED"},
    )
    assert repeat_res.status_code == 409


def test_review_membership_reject(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()

    treasurer_headers = auth_headers("treasurer_rej@example.com")
    treasurer = db.scalars(select(User).where(User.email == "treasurer_rej@example.com")).one()

    school_class, code = _setup_class_with_code(db, treasurer)
    child = _create_child(db, parent_user.id, first_name="Tim")

    join_res = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )
    assert join_res.status_code == 201
    membership_id = join_res.json()["id"]

    # Class treasurer rejects the request (REJECTED) -> 200 OK
    reject_res = client.patch(
        f"/api/classes/{school_class.id}/members/{membership_id}",
        headers=treasurer_headers,
        json={"status": "REJECTED"},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == MembershipStatus.REJECTED.value
    assert reject_res.json()["left_at"] is not None
