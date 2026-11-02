from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ClassAccessCode, SchoolClass
from app.modules.users.models import User


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
    db: Session, treasurer, valid_until=None, active=True
) -> tuple[SchoolClass, ClassAccessCode]:
    school_class = SchoolClass(
        id=uuid4(),
        name="Klasa 1A",
        school_name="SP 15",
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


def test_join_class_success(client: TestClient, parent, db: Session):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()

    treasurer = User(
        id=uuid4(),
        email="treasurer@example.com",
        password_hash="dummy",
        first_name="Pani",
        last_name="Skarbnik",
    )
    db.add(treasurer)
    db.commit()

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


def test_join_class_invalid_or_expired_code(client: TestClient, parent, db: Session):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()
    child = _create_child(db, parent_user.id)

    # 1. Non-existing code -> 404
    res_unknown = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": "NON_EXISTING", "child_id": str(child.id)},
    )
    assert res_unknown.status_code == 404
    assert res_unknown.json()["detail"] == "Invalid or expired access code"

    # 2. Expired code -> 404
    treasurer = User(
        id=uuid4(),
        email="treasurer2@example.com",
        password_hash="dummy",
        first_name="Tomasz",
        last_name="Kot",
    )
    db.add(treasurer)
    db.commit()

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


def test_join_class_child_not_owned(client: TestClient, parent, db: Session):
    other_parent = User(
        id=uuid4(),
        email="other.parent@example.com",
        password_hash="dummy",
        first_name="Jan",
        last_name="Obcy",
    )
    db.add(other_parent)
    db.commit()

    _, code = _setup_class_with_code(db, other_parent)
    other_child = _create_child(db, other_parent.id)

    response = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(other_child.id)},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Child not found"


def test_join_class_conflict_already_pending_or_active(client: TestClient, parent, db: Session):
    parent_user = db.scalars(select(User).where(User.email == "parent@example.com")).one()
    treasurer = User(
        id=uuid4(),
        email="treasurer3@example.com",
        password_hash="dummy",
        first_name="Anna",
        last_name="Bak",
    )
    db.add(treasurer)
    db.commit()

    _, code = _setup_class_with_code(db, treasurer)
    child = _create_child(db, parent_user.id)

    # First request -> 201 Created
    res1 = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )
    assert res1.status_code == 201

    # Repeated request for the same class -> 409 Conflict
    res2 = client.post(
        "/api/classes/join",
        headers=parent,
        json={"code": code.code, "child_id": str(child.id)},
    )
    assert res2.status_code == 409
    assert res2.json()["detail"] == "Join request is already pending"
