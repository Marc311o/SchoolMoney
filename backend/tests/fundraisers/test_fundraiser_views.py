from decimal import Decimal

from tests.fundraisers.helpers import URL, create_school_setup, create_test_fundraiser


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
