from decimal import Decimal

from app.modules.fundraisers.enums import FundraiserStatus
from tests.fundraisers.helpers import (
    URL,
    create_school_setup,
    create_test_fundraiser,
    top_up_wallet,
)


def test_close_fundraiser_with_automatic_refunds(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]
    other_parent = school.headers["other_parent"]

    top_up_wallet(client, parent, "100.00")
    top_up_wallet(client, other_parent, "100.00")

    client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=parent,
        json={"child_id": school.own_child_id},
    )
    client.post(
        f"{URL}/{fundraiser_id}/payments",
        headers=other_parent,
        json={"child_id": school.other_child_id},
    )

    res = client.post(f"{URL}/{fundraiser_id}/close", headers=treasurer)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == FundraiserStatus.CLOSED
    assert data["refund_transactions"] == 2
    assert Decimal(data["refunded_total"]) == Decimal("100.50")

    p_wallet = client.get("/api/accounts/me", headers=parent).json()
    o_wallet = client.get("/api/accounts/me", headers=other_parent).json()
    assert Decimal(p_wallet["balance"]) == Decimal("100.00")
    assert Decimal(o_wallet["balance"]) == Decimal("100.00")

    res_second = client.post(f"{URL}/{fundraiser_id}/close", headers=treasurer)
    assert res_second.status_code == 409
    assert res_second.json()["detail"] == "Fundraiser is already closed"


def test_parent_cannot_close_fundraiser(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]

    res = client.post(f"{URL}/{fundraiser_id}/close", headers=parent)
    assert res.status_code == 404
