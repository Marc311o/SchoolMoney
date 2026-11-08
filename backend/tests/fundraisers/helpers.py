from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select

from app.modules.classrooms.enums import MembershipStatus
from app.modules.users.models import User
from tests.factories import make_child, make_class, make_membership

URL = "/api/fundraisers"
RATE = Decimal("50.25")


def create_school_setup(db, auth_headers) -> SimpleNamespace:
    headers = {
        role: auth_headers(f"{role}@example.com")
        for role in ("treasurer", "parent", "other_parent")
    }
    users = {user.email.split("@")[0]: user for user in db.scalars(select(User))}
    school_class = make_class(db, users["treasurer"].id)
    own_child = make_child(db, users["parent"].id)
    other_child = make_child(db, users["other_parent"].id, first_name="Jan")
    pending_child = make_child(db, users["parent"].id, first_name="Maja")
    for child in (own_child, other_child):
        make_membership(db, child.id, school_class.id)
    pending = make_membership(db, pending_child.id, school_class.id, MembershipStatus.PENDING)
    db.commit()
    today = datetime.now(ZoneInfo("Europe/Warsaw")).date()
    return SimpleNamespace(
        class_id=school_class.id,
        own_child_id=str(own_child.id),
        other_child_id=str(other_child.id),
        pending_child_id=str(pending_child.id),
        pending_membership_id=pending.id,
        headers=headers,
        user_ids={role: user.id for role, user in users.items()},
        payload={
            "class_id": str(school_class.id),
            "name": "School trip",
            "required_amount_per_child": str(RATE),
            "start_date": str(today - timedelta(days=1)),
            "end_date": str(today + timedelta(days=1)),
        },
        today=today,
    )


def create_test_fundraiser(client, school) -> UUID:
    response = client.post(URL, headers=school.headers["treasurer"], json=school.payload)
    assert response.status_code == 201, response.text
    return UUID(response.json()["id"])


def top_up_wallet(client, headers, amount="100.00") -> None:
    response = client.post("/api/accounts/me/top-up", headers=headers, json={"amount": amount})
    assert response.status_code == 200, response.text
