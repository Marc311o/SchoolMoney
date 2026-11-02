from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.modules.classrooms import service
from app.modules.classrooms.models import ClassAccessCode
from app.modules.users.enums import UserRole
from app.modules.users.models import User
from tests.factories import make_child, make_class, make_membership


@pytest.fixture
def school(db, auth_headers):
    headers = {
        role: auth_headers(f"{role}@example.com")
        for role in ("treasurer", "parent", "other_treasurer", "admin")
    }

    users = {user.email.split("@")[0]: user for user in db.scalars(select(User)).all()}

    users["admin"].role = UserRole.ADMIN

    school_class = make_class(db, users["treasurer"].id)
    other_class = make_class(db, users["other_treasurer"].id, name="2B")

    child = make_child(db, users["parent"].id)
    membership = make_membership(db, child.id, school_class.id)

    db.commit()

    return {
        "headers": headers,
        "users": users,
        "class": school_class,
        "other_class": other_class,
        "membership": membership,
        "url": f"/api/classes/{school_class.id}/access-code",
    }


def add_code(db, school_class, *, active=True, valid_until=None):
    code = ClassAccessCode(
        id=uuid4(),
        class_id=school_class.id,
        code=uuid4().hex,
        active=active,
        valid_until=valid_until,
    )
    db.add(code)
    db.commit()
    return code


@pytest.mark.parametrize("method", ["get", "post"])
def test_requires_login(client, method):
    response = client.request(
        method,
        f"/api/classes/{uuid4()}/access-code",
        json={},
    )

    assert response.status_code == 401


@pytest.mark.parametrize("role", ["parent", "other_treasurer", "admin"])
@pytest.mark.parametrize("method", ["get", "post"])
def test_only_this_class_treasurer_has_access(client, db, school, role, method):
    original = add_code(db, school["class"])

    response = client.request(
        method,
        school["url"],
        headers=school["headers"][role],
        json={},
    )

    assert response.status_code == 404

    db.refresh(original)
    assert original.active is True
    assert len(db.scalars(select(ClassAccessCode)).all()) == 1


@pytest.mark.parametrize("method", ["get", "post"])
def test_missing_class(client, school, method):
    response = client.request(
        method,
        f"/api/classes/{uuid4()}/access-code",
        headers=school["headers"]["treasurer"],
        json={},
    )

    assert response.status_code == 404


def test_get_without_code_returns_null_and_does_not_create_one(client, db, school):
    response = client.get(
        school["url"],
        headers=school["headers"]["treasurer"],
    )

    assert response.status_code == 200
    assert response.json() is None
    assert response.headers["cache-control"] == "no-store"
    assert db.scalars(select(ClassAccessCode)).all() == []


def test_treasurer_without_a_child_can_read_code(client, db, school):
    code = add_code(db, school["class"])

    response = client.get(
        school["url"],
        headers=school["headers"]["treasurer"],
    )

    assert response.status_code == 200
    assert response.json()["code"] == code.code
    assert response.json()["class_id"] == str(school["class"].id)


@pytest.mark.parametrize("expired", [False, True])
def test_inactive_or_expired_code_is_not_returned(client, db, school, expired):
    add_code(
        db,
        school["class"],
        active=expired,
        valid_until=(datetime.now(UTC) - timedelta(days=1) if expired else None),
    )

    response = client.get(
        school["url"],
        headers=school["headers"]["treasurer"],
    )

    assert response.status_code == 200
    assert response.json() is None


def test_generate_and_regenerate(client, db, school):
    headers = school["headers"]["treasurer"]

    first = client.post(school["url"], headers=headers, json={})
    second = client.post(school["url"], headers=headers, json={})

    assert first.status_code == second.status_code == 201
    assert second.headers["cache-control"] == "no-store"
    assert first.json()["id"] != second.json()["id"]
    assert first.json()["code"] != second.json()["code"]
    assert second.json()["active"] is True
    assert second.json()["valid_until"] is None

    current = client.get(school["url"], headers=headers)
    assert current.json() == second.json()

    rows = db.scalars(select(ClassAccessCode)).all()

    assert len(rows) == 2
    assert [row.code for row in rows if row.active] == [second.json()["code"]]

    db.refresh(school["membership"])
    assert school["membership"].status.value == "ACTIVE"


def test_regeneration_disables_all_old_codes_only_in_this_class(client, db, school):
    old_codes = [add_code(db, school["class"]) for _ in range(2)]
    other = add_code(db, school["other_class"])

    response = client.post(
        school["url"],
        headers=school["headers"]["treasurer"],
        json={},
    )

    assert response.status_code == 201

    for code in old_codes:
        db.refresh(code)
        assert code.active is False

    db.refresh(other)
    assert other.active is True


def test_future_expiry_is_supported(client, school):
    expiry = (datetime.now(UTC) + timedelta(days=7)).isoformat()

    response = client.post(
        school["url"],
        headers=school["headers"]["treasurer"],
        json={"valid_until": expiry},
    )

    assert response.status_code == 201
    assert response.json()["valid_until"] is not None

    current = client.get(
        school["url"],
        headers=school["headers"]["treasurer"],
    )

    assert current.json() is not None


@pytest.mark.parametrize(
    "data",
    [
        {"valid_until": "2000-01-01T00:00:00Z"},
        {"valid_until": "2099-01-01T00:00:00"},
        {"code": "chosen-by-client"},
    ],
)
def test_invalid_payload_does_not_replace_code(client, db, school, data):
    original = add_code(db, school["class"])

    response = client.post(
        school["url"],
        headers=school["headers"]["treasurer"],
        json=data,
    )

    assert response.status_code == 422

    db.refresh(original)
    assert original.active is True


def test_unique_code_collision_is_retried(client, db, school, monkeypatch):
    old = add_code(db, school["class"])
    candidates = iter([old.code, "new-unique-code"])

    monkeypatch.setattr(service, "token_urlsafe", lambda _: next(candidates))

    response = client.post(
        school["url"],
        headers=school["headers"]["treasurer"],
        json={},
    )

    assert response.status_code == 201
    assert response.json()["code"] == "new-unique-code"

    db.refresh(old)
    assert old.active is False


def test_generation_failure_preserves_previous_code(client, db, school, monkeypatch):
    old = add_code(db, school["class"])

    monkeypatch.setattr(service, "token_urlsafe", lambda _: old.code)

    response = client.post(
        school["url"],
        headers=school["headers"]["treasurer"],
        json={},
    )

    assert response.status_code == 503

    db.refresh(old)
    assert old.active is True
    assert len(db.scalars(select(ClassAccessCode)).all()) == 1


def test_regular_class_responses_do_not_leak_code(client, db, school):
    code = add_code(db, school["class"])

    for path in ("/api/classes", f"/api/classes/{school['class'].id}"):
        response = client.get(
            path,
            headers=school["headers"]["parent"],
        )

        assert response.status_code == 200
        assert code.code not in response.text
        assert "access_code" not in response.text
