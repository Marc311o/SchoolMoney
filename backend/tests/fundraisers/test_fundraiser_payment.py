from decimal import Decimal
from uuid import UUID

import pytest

from app.modules.accounts.enums import TransactionType
from app.modules.accounts.models import Transaction
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.models import Fundraiser
from tests.fundraisers.helpers import (
    RATE,
    URL,
    create_school_setup,
    create_test_fundraiser,
    top_up_wallet,
)


def test_successful_payment_for_child(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "100.00")
    url = f"{URL}/{fundraiser_id}/payments"

    response = client.post(url, headers=parent, json={"child_id": school.own_child_id})
    assert response.status_code == 201
    payment = response.json()
    assert payment["child_id"] == school.own_child_id
    assert payment["payer_id"] == str(school.user_ids["parent"])
    assert Decimal(payment["amount"]) == RATE

    tx = db.get(Transaction, UUID(payment["transaction_id"]))
    assert tx.type == TransactionType.FUNDRAISER_PAYMENT
    assert tx.amount == RATE

    detail = client.get(f"{URL}/{fundraiser_id}", headers=parent).json()
    assert Decimal(detail["progress"]["paid_total"]) == RATE
    assert Decimal(detail["progress"]["current_balance"]) == RATE
    children = {c["child_id"]: c for c in detail["children"]}
    assert children[school.own_child_id]["is_paid"] is True


def test_payment_fails_insufficient_funds(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "10.00")
    url = f"{URL}/{fundraiser_id}/payments"

    response = client.post(url, headers=parent, json={"child_id": school.own_child_id})
    assert response.status_code == 409
    assert response.json()["detail"] == "Not enough money in your wallet"


def test_payment_fails_already_paid(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    other_parent = school.headers["other_parent"]
    top_up_wallet(client, parent, "100.00")
    top_up_wallet(client, other_parent, "100.00")
    url = f"{URL}/{fundraiser_id}/payments"

    res1 = client.post(url, headers=parent, json={"child_id": school.own_child_id})
    assert res1.status_code == 201

    res2 = client.post(url, headers=other_parent, json={"child_id": school.own_child_id})
    assert res2.status_code == 409
    assert res2.json()["detail"] == "Child is already paid"


def test_payment_fails_non_participant_or_pending(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "100.00")
    url = f"{URL}/{fundraiser_id}/payments"

    response = client.post(url, headers=parent, json={"child_id": school.pending_child_id})
    assert response.status_code == 404
    assert response.json()["detail"] == "Participant not found"


@pytest.mark.parametrize("status_val", [FundraiserStatus.DRAFT, FundraiserStatus.CLOSED])
def test_payment_fails_when_fundraiser_not_active(client, db, auth_headers, status_val):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    fundraiser = db.get(Fundraiser, fundraiser_id)
    fundraiser.status = status_val
    db.commit()

    treasurer = school.headers["treasurer"]
    top_up_wallet(client, treasurer, "100.00")
    url = f"{URL}/{fundraiser_id}/payments"

    response = client.post(url, headers=treasurer, json={"child_id": school.own_child_id})
    assert response.status_code == 409
    assert response.json()["detail"] == "Fundraiser is not accepting payments"
