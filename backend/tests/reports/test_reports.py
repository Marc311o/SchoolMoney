from uuid import UUID

import pytest

from app.modules.classrooms.models import SchoolClass
from app.modules.fundraisers.enums import FundraiserStatus
from tests.factories import make_class, make_fundraiser, make_obligation
from tests.fundraisers.helpers import (
    close_fundraiser_helper,
    create_school_setup,
    create_test_fundraiser,
    pay_for_child_helper,
    refund_payment_helper,
    top_up_wallet,
)

URL = "/api/reports"


@pytest.fixture
def school(db, auth_headers):
    return create_school_setup(db, auth_headers)


@pytest.fixture
def fundraiser_id(client, school):
    return create_test_fundraiser(client, school)


def read_report(client, scope, subject_id, headers):
    response = client.get(f"{URL}/{scope}/{subject_id}", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()


def test_reports_sum_contributions_and_actual_refunds(client, school, fundraiser_id):
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "250.00")

    first = pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)
    refund_payment_helper(client, fundraiser_id, first["id"], parent)
    pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)
    pay_for_child_helper(client, fundraiser_id, school.other_child_id, parent)
    for operation, amount in (("withdrawals", "85.50"), ("deposits", "5.00")):
        response = client.post(
            f"/api/fundraisers/{fundraiser_id}/{operation}",
            headers=treasurer,
            json={"amount": amount},
        )
        assert response.status_code == 201, response.text
    close_fundraiser_helper(client, fundraiser_id, treasurer)

    report = read_report(client, "fundraiser", fundraiser_id, parent)
    assert report["contributions"] == {
        "expected_total": "100.50",
        "paid_total": "150.75",
        "refunded_total": "70.25",
        "net_paid_total": "80.50",
    }
    assert report["account"] == {
        "current_balance": "0.00",
        "treasurer_deposited_total": "5.00",
        "treasurer_withdrawn_total": "85.50",
    }
    children = {row["id"]: row["contributions"] for row in report["rows"]}
    assert set(children) == {school.own_child_id, school.other_child_id}
    assert children[school.own_child_id] == {
        "expected_total": "50.25",
        "paid_total": "100.50",
        "refunded_total": "60.25",
        "net_paid_total": "40.25",
    }

    response = client.post(
        "/api/fundraisers",
        headers=treasurer,
        json={**school.payload, "name": "Museum", "required_amount_per_child": "30.00"},
    )
    assert response.status_code == 201, response.text
    second_id = response.json()["id"]
    pay_for_child_helper(client, second_id, school.own_child_id, parent)

    child_report = read_report(client, "child", school.own_child_id, parent)
    assert child_report["contributions"] == {
        "expected_total": "80.25",
        "paid_total": "130.50",
        "refunded_total": "60.25",
        "net_paid_total": "70.25",
    }
    assert child_report["account"] is None
    assert {row["id"] for row in child_report["rows"]} == {str(fundraiser_id), second_id}
    assert all(row["account"] is None for row in child_report["rows"])

    class_report = read_report(client, "class", school.class_id, treasurer)
    assert class_report["contributions"] == {
        "expected_total": "160.50",
        "paid_total": "180.75",
        "refunded_total": "70.25",
        "net_paid_total": "110.50",
    }
    assert class_report["account"] == {**report["account"], "current_balance": "30.00"}
    assert {row["id"] for row in class_report["rows"]} == {str(fundraiser_id), second_id}


def test_reports_enforce_scope_permissions(client, school, fundraiser_id, auth_headers, admin):
    outsider = auth_headers("outsider@example.com")
    parent = school.headers["parent"]
    endpoints = (
        ("fundraiser", fundraiser_id),
        ("child", school.own_child_id),
        ("class", school.class_id),
    )
    for scope, subject_id in endpoints:
        url = f"{URL}/{scope}/{subject_id}"
        assert client.get(url).status_code == 401
        assert client.get(url, headers=outsider).status_code == 404
        assert client.get(url, headers=admin).status_code == 200
    assert client.get(f"{URL}/child/{school.other_child_id}", headers=parent).status_code == 404
    assert client.get(f"{URL}/class/{school.class_id}", headers=parent).status_code == 404


def test_reports_keep_payment_history_after_child_is_archived(client, school, fundraiser_id):
    parent = school.headers["parent"]
    top_up_wallet(client, parent)
    payment = pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)
    refund_payment_helper(client, fundraiser_id, payment["id"], parent)

    response = client.delete(f"/api/children/{school.own_child_id}", headers=parent)
    assert response.status_code == 204, response.text
    report = read_report(client, "child", school.own_child_id, parent)
    assert report["contributions"] == {
        "expected_total": "0.00",
        "paid_total": "50.25",
        "refunded_total": "50.25",
        "net_paid_total": "0.00",
    }
    assert [row["id"] for row in report["rows"]] == [str(fundraiser_id)]


def test_empty_report_and_class_report_excludes_drafts_and_other_classes(
    client, db, school, fundraiser_id
):
    treasurer = school.headers["treasurer"]
    empty = read_report(client, "child", school.pending_child_id, school.headers["parent"])
    assert empty["rows"] == []
    assert empty["contributions"]["expected_total"] == "0.00"

    draft = make_fundraiser(db, db.get(SchoolClass, school.class_id), FundraiserStatus.DRAFT)
    make_obligation(db, draft, UUID(school.own_child_id))
    other_class = make_class(db, school.user_ids["treasurer"], name="2B")
    make_fundraiser(db, other_class)
    db.commit()

    report = read_report(client, "class", school.class_id, treasurer)
    assert [row["id"] for row in report["rows"]] == [str(fundraiser_id)]
    assert report["contributions"]["expected_total"] == "100.50"
