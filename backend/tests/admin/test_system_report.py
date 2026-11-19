import csv
from io import StringIO
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.modules.fundraisers.enums import FundraiserStatus
from tests.factories import make_class, make_fundraiser, make_obligation
from tests.fundraisers.helpers import (
    create_school_setup,
    create_test_fundraiser,
    pay_for_child_helper,
    refund_payment_helper,
    top_up_wallet,
)


@pytest.fixture
def school(db: Session, auth_headers):
    return create_school_setup(db, auth_headers)


@pytest.fixture
def fundraiser_id(client: TestClient, school):
    return create_test_fundraiser(client, school)


def test_system_report_endpoints_require_admin(client: TestClient, school, admin):
    urls = (
        "/api/admin/overview",
        "/api/admin/report/export?format=csv",
        "/api/admin/report/export?format=pdf",
    )
    for url in urls:
        assert client.get(url).status_code == 401, url
        assert client.get(url, headers=school.headers["parent"]).status_code == 403, url
        assert client.get(url, headers=school.headers["treasurer"]).status_code == 403, url
        assert client.get(url, headers=admin).status_code == 200, url


def test_admin_overview_aggregates_classes_and_excludes_drafts(
    client: TestClient, db: Session, school, fundraiser_id, admin
):
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]
    top_up_wallet(client, parent, "300.00")

    # Class 1 ("1A"): payment + full refund, repeat payment, second child payment, treasurer ops
    first_payment = pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)
    refund_payment_helper(client, fundraiser_id, first_payment["id"], parent)
    pay_for_child_helper(client, fundraiser_id, school.own_child_id, parent)
    pay_for_child_helper(client, fundraiser_id, school.other_child_id, parent)
    for operation, amount in (("withdrawals", "20.00"), ("deposits", "5.00")):
        res = client.post(
            f"/api/fundraisers/{fundraiser_id}/{operation}",
            headers=treasurer,
            json={"amount": amount},
        )
        assert res.status_code == 201, res.text

    # Draft fundraiser in Class 1 must not be included in system totals or active count
    from app.modules.classrooms.models import SchoolClass

    draft = make_fundraiser(
        db,
        db.get(SchoolClass, school.class_id),
        FundraiserStatus.DRAFT,
        amount="99.00",
    )
    make_obligation(db, draft, UUID(school.own_child_id))

    # Class 2 ("2B"): one active fundraiser with one obligation, no payments yet
    second_class = make_class(db, school.user_ids["treasurer"], name="2B", school_name="SP nr 67")
    second_fundraiser = make_fundraiser(db, second_class, FundraiserStatus.ACTIVE, amount="40.00")
    make_obligation(db, second_fundraiser, UUID(school.other_child_id))

    # Class 3 ("3C"): empty class with no fundraisers
    empty_class = make_class(db, school.user_ids["treasurer"], name="3C", school_name=None)
    db.commit()

    response = client.get("/api/admin/overview", headers=admin)
    assert response.status_code == 200, response.text
    overview = response.json()

    assert overview["classes_count"] == 3
    assert overview["treasurers_count"] == 1
    assert overview["active_fundraisers_count"] == 2
    assert overview["parents_count"] >= 2

    report = overview["report"]
    assert report["scope"] == "system"
    assert report["name"] == "SchoolMoney"
    assert report["currency"] == "PLN"

    # Expected: (2 * 50.25) + 40.00 = 140.50
    # Paid: 3 * 50.25 = 150.75 | Refunded: 50.25 | Net paid: 100.50
    assert report["contributions"] == {
        "expected_total": "140.50",
        "paid_total": "150.75",
        "refunded_total": "50.25",
        "net_paid_total": "100.50",
    }
    # Current balance: 100.50 - 20.00 + 5.00 = 85.50
    assert report["account"] == {
        "current_balance": "85.50",
        "treasurer_deposited_total": "5.00",
        "treasurer_withdrawn_total": "20.00",
    }

    rows = {row["id"]: row for row in report["rows"]}
    assert set(rows) == {str(school.class_id), str(second_class.id), str(empty_class.id)}

    assert rows[str(school.class_id)]["contributions"] == {
        "expected_total": "100.50",
        "paid_total": "150.75",
        "refunded_total": "50.25",
        "net_paid_total": "100.50",
    }
    assert rows[str(second_class.id)]["name"] == "2B (SP nr 67)"
    assert rows[str(second_class.id)]["contributions"] == {
        "expected_total": "40.00",
        "paid_total": "0.00",
        "refunded_total": "0.00",
        "net_paid_total": "0.00",
    }
    assert rows[str(empty_class.id)]["name"] == "3C"
    assert rows[str(empty_class.id)]["contributions"] == {
        "expected_total": "0.00",
        "paid_total": "0.00",
        "refunded_total": "0.00",
        "net_paid_total": "0.00",
    }


@pytest.mark.parametrize(
    ("lang", "first_col", "total_prefix"),
    [
        ("pl", "Klasa", "Razem - SchoolMoney"),
        ("en", "Class", "Total - SchoolMoney"),
    ],
)
def test_admin_system_report_csv_export(
    client: TestClient, school, fundraiser_id, admin, lang: str, first_col: str, total_prefix: str
):
    response = client.get(
        f"/api/admin/report/export?format=csv&lang={lang}",
        headers=admin,
    )
    assert response.status_code == 200
    assert response.headers["content-disposition"] == 'attachment; filename="system-report.csv"'
    assert response.headers["content-language"] == lang
    assert response.headers["cache-control"] == "no-store"

    parsed = list(csv.reader(StringIO(response.content.decode("utf-8-sig"))))
    assert parsed[0][0] == first_col
    assert len(parsed[0]) == 8
    assert parsed[-1][0] == total_prefix
    assert parsed[-1][1] == "100.50"


@pytest.mark.parametrize("lang", ["pl", "en"])
def test_admin_system_report_pdf_export(
    client: TestClient, school, fundraiser_id, admin, lang: str
):
    response = client.get(
        f"/api/admin/report/export?format=pdf&lang={lang}",
        headers=admin,
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="system-report.pdf"'
    assert response.headers["content-language"] == lang
    assert response.content.startswith(b"%PDF-")
