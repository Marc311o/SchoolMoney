from decimal import Decimal

from app.modules.classrooms.enums import MembershipStatus
from app.modules.fundraisers.enums import FundraiserChildPaymentStatus, FundraiserStatus
from tests.fundraisers.helpers import (
    URL,
    close_fundraiser_helper,
    create_school_setup,
    create_test_fundraiser,
    pay_for_child_helper,
    refund_payment_helper,
    top_up_wallet,
)


def test_list_fundraisers_for_class(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]

    response = client.get(URL, headers=parent, params={"class_id": str(school.class_id)})
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert any(item["id"] == str(fundraiser_id) for item in items)


def test_outsider_cannot_view_fundraiser_or_list(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    outsider = auth_headers("outsider@example.com")
    url = f"{URL}/{fundraiser_id}"

    assert client.get(url, headers=outsider).status_code == 404
    assert client.get(f"{url}/children", headers=outsider).status_code == 404
    resp = client.get(URL, headers=outsider, params={"class_id": str(school.class_id)})
    assert resp.status_code == 200
    assert resp.json() == []


def test_fundraiser_detail_progress_and_children_status(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    url = f"{URL}/{fundraiser_id}"

    response = client.get(url, headers=parent)
    assert response.status_code == 200
    data = response.json()

    progress = data["progress"]
    assert progress["children_count"] == 2
    assert Decimal(progress["required_total"]) == Decimal("100.50")
    assert Decimal(progress["paid_total"]) == Decimal("0.00")
    assert Decimal(progress["current_balance"]) == Decimal("0.00")

    children = {child["child_id"]: child for child in data["children"]}
    assert school.own_child_id in children
    assert school.other_child_id in children
    assert children[school.own_child_id]["is_paid"] is False
    assert Decimal(children[school.own_child_id]["remaining_amount"]) == Decimal("50.25")


def test_get_fundraiser_children_active_statuses(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    url = f"{URL}/{fundraiser_id}"

    top_up_wallet(client, parent, "100.00")
    pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)

    res = client.get(f"{url}/children", headers=parent)
    assert res.status_code == 200
    data = res.json()

    assert data["fundraiser_id"] == str(fundraiser_id)
    assert data["status"] == FundraiserStatus.ACTIVE.value
    assert len(data["children"]) == 2

    children_by_id = {c["child"]["id"]: c for c in data["children"]}

    # Opłacone dziecko current_usera
    own = children_by_id[school.own_child_id]
    assert own["is_current_user_child"] is True
    assert own["payment_status"] == FundraiserChildPaymentStatus.PAID.value
    assert own["payment"]["is_paid"] is True
    assert own["payment"]["payer"] is not None
    assert own["payment"]["payer"]["id"] == str(school.user_ids["parent"])
    assert own["payment"]["paid_at"] is not None
    assert Decimal(own["refunded_amount"]) == Decimal("0.00")

    # Nieopłacone dziecko innego rodzica
    other = children_by_id[school.other_child_id]
    assert other["is_current_user_child"] is False
    assert other["payment_status"] == FundraiserChildPaymentStatus.UNPAID.value
    assert other["payment"]["is_paid"] is False
    assert other["payment"]["payer"] is None
    assert other["payment"]["paid_at"] is None
    assert Decimal(other["refunded_amount"]) == Decimal("0.00")


def test_get_fundraiser_children_manual_refund_becomes_unpaid(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    url = f"{URL}/{fundraiser_id}"

    top_up_wallet(client, parent, "100.00")
    payment = pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)

    # Ręczny zwrot przed zamknięciem (PAYMENT_REFUND)
    refund_payment_helper(client, fundraiser_id, payment["id"], parent)

    res = client.get(f"{url}/children", headers=parent)
    assert res.status_code == 200
    data = res.json()

    own = next(c for c in data["children"] if c["child"]["id"] == school.own_child_id)
    assert own["payment_status"] == FundraiserChildPaymentStatus.UNPAID.value
    assert own["payment"]["is_paid"] is False
    assert own["payment"]["payer"]["id"] == str(school.user_ids["parent"])
    assert own["payment"]["paid_at"] is not None
    assert Decimal(own["refunded_amount"]) == Decimal("0.00")


def test_get_fundraiser_children_closed_refunds_and_excludes_late_members(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]
    treasurer = school.headers["treasurer"]
    url = f"{URL}/{fundraiser_id}"

    top_up_wallet(client, parent, "100.00")
    pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)

    close_fundraiser_helper(client, fundraiser_id, treasurer)

    review_url = f"/api/classes/{school.class_id}/members/{school.pending_membership_id}"
    approve_res = client.patch(
        review_url,
        headers=treasurer,
        json={"status": MembershipStatus.ACTIVE.value},
    )
    assert approve_res.status_code == 200

    res_closed = client.get(f"{url}/children", headers=parent)
    assert res_closed.status_code == 200
    data = res_closed.json()

    assert data["status"] == FundraiserStatus.CLOSED.value
    children_ids = [c["child"]["id"] for c in data["children"]]

    assert school.pending_child_id not in children_ids
    assert school.own_child_id in children_ids
    assert school.other_child_id in children_ids

    own = next(c for c in data["children"] if c["child"]["id"] == school.own_child_id)
    assert own["payment_status"] == FundraiserChildPaymentStatus.REFUNDED.value
    assert own["payment"]["is_paid"] is True
    assert Decimal(own["refunded_amount"]) == Decimal("50.25")

    detail = client.get(url, headers=parent).json()
    assert detail["progress"]["paid_total"] == "50.25"
    assert detail["progress"]["current_balance"] == "0.00"
