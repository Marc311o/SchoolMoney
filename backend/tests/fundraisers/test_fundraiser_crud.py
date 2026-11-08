from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select

from app.modules.accounts.enums import AccountType
from app.modules.accounts.models import Account
from app.modules.fundraisers.models import Fundraiser, FundraiserObligation
from tests.fundraisers.helpers import URL, create_school_setup, create_test_fundraiser


def test_parent_cannot_create_fundraiser(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    response = client.post(URL, headers=school.headers["parent"], json=school.payload)
    assert response.status_code == 404


def test_treasurer_creates_fundraiser_with_wallet_and_obligations(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    treasurer = school.headers["treasurer"]
    response = client.post(URL, headers=treasurer, json=school.payload)
    assert response.status_code == 201
    data = response.json()
    fundraiser_id = UUID(data["id"])

    # Sprawdzenie utworzenia konta portfela zbiórki
    account = db.scalar(select(Account).where(Account.fundraiser_id == fundraiser_id))
    assert account is not None
    assert account.account_type == AccountType.FUNDRAISER
    assert account.balance == Decimal("0.00")
    assert account.iban == data["iban"]

    # Sprawdzenie snapshotu aktywnych dzieci jako zobowiązań
    obligations = db.scalars(
        select(FundraiserObligation.child_id).where(
            FundraiserObligation.fundraiser_id == fundraiser_id
        )
    ).all()
    assert set(str(cid) for cid in obligations) == {school.own_child_id, school.other_child_id}
    assert school.pending_child_id not in [str(cid) for cid in obligations]


def test_treasurer_updates_fundraiser(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    url = f"{URL}/{fundraiser_id}"
    update_data = {"name": "New Trip Name", "description": "Updated details"}

    response = client.patch(url, headers=treasurer, json=update_data)
    assert response.status_code == 200
    assert response.json()["name"] == "New Trip Name"
    assert response.json()["description"] == "Updated details"


def test_parent_cannot_update_or_delete_fundraiser(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    url = f"{URL}/{fundraiser_id}"

    assert client.patch(url, headers=parent, json={"name": "Hacked"}).status_code == 404
    assert client.delete(url, headers=parent).status_code == 404


def test_date_validation_on_create(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    treasurer = school.headers["treasurer"]
    invalid_payload = {
        **school.payload,
        "start_date": str(school.today + timedelta(days=5)),
        "end_date": str(school.today),
    }
    response = client.post(URL, headers=treasurer, json=invalid_payload)
    assert response.status_code == 422


def test_amount_validation_on_create(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    treasurer = school.headers["treasurer"]
    invalid_payload = {
        **school.payload,
        "required_amount_per_child": "0.00",
    }
    response = client.post(URL, headers=treasurer, json=invalid_payload)
    assert response.status_code == 422


def test_treasurer_deletes_fundraiser(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    url = f"{URL}/{fundraiser_id}"

    response = client.delete(url, headers=treasurer)
    assert response.status_code == 204

    assert db.get(Fundraiser, fundraiser_id) is None
    assert db.scalar(select(Account.id).where(Account.fundraiser_id == fundraiser_id)) is None
    assert (
        db.scalar(
            select(FundraiserObligation.id).where(
                FundraiserObligation.fundraiser_id == fundraiser_id
            )
        )
        is None
    )
