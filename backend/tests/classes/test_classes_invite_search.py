from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.classrooms.models import ClassAccessCode, SchoolClass
from app.modules.users.models import User
from tests.conftest import AuthHeaders


def _setup_class_with_code(
    db: Session, treasurer: User, valid_until=None, active=True
) -> tuple[SchoolClass, ClassAccessCode]:
    school_class = SchoolClass(
        id=uuid4(),
        name="Class 3B",
        school_name="Primary School 10",
        treasurer_id=treasurer.id,
    )
    db.add(school_class)
    db.flush()

    code = ClassAccessCode(
        id=uuid4(),
        class_id=school_class.id,
        code=f"INVITE_{uuid4().hex[:8]}",
        valid_until=valid_until,
        active=active,
    )
    db.add(code)
    db.commit()
    db.refresh(school_class)
    db.refresh(code)
    return school_class, code


def test_search_parents_by_email(client: TestClient, parent, auth_headers: AuthHeaders):
    # Register search targets
    auth_headers("search.target1@example.com")
    auth_headers("search.target2@example.com")
    auth_headers("other.user@example.com")

    # Search for substring
    response = client.get(
        "/api/users/search",
        headers=parent,
        params={"email": "target"},
    )
    assert response.status_code == 200
    results = response.json()
    emails = [r["email"] for r in results]
    assert "search.target1@example.com" in emails
    assert "search.target2@example.com" in emails
    assert "other.user@example.com" not in emails


def test_search_parents_short_query(client: TestClient, parent):
    response = client.get(
        "/api/users/search",
        headers=parent,
        params={"email": "a"},
    )
    assert response.status_code == 422


def test_get_invite_details_success(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    auth_headers("treasurer_inv@example.com")
    from sqlalchemy import select

    treasurer = db.scalars(select(User).where(User.email == "treasurer_inv@example.com")).one()
    school_class, code = _setup_class_with_code(db, treasurer)

    response = client.get(f"/api/classes/invites/{code.code}", headers=parent)
    assert response.status_code == 200
    data = response.json()
    assert data["class_id"] == str(school_class.id)
    assert data["class_name"] == "Class 3B"
    assert data["school_name"] == "Primary School 10"
    assert data["code"] == code.code
    assert f"{treasurer.first_name} {treasurer.last_name}" in data["treasurer_name"]


def test_get_invite_details_invalid_or_expired(
    client: TestClient, parent, auth_headers: AuthHeaders, db: Session
):
    # 1. Non-existent code
    res_404 = client.get("/api/classes/invites/INVALID_CODE", headers=parent)
    assert res_404.status_code == 404

    # 2. Expired code
    auth_headers("treasurer_inv_exp@example.com")
    from sqlalchemy import select

    treasurer = db.scalars(select(User).where(User.email == "treasurer_inv_exp@example.com")).one()
    _, expired_code = _setup_class_with_code(
        db, treasurer, valid_until=datetime.now(UTC) - timedelta(minutes=1)
    )

    res_expired = client.get(f"/api/classes/invites/{expired_code.code}", headers=parent)
    assert res_expired.status_code == 404
