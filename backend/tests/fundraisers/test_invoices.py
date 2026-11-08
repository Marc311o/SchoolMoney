from decimal import Decimal

from tests.fundraisers.helpers import (
    URL,
    create_school_setup,
    create_test_fundraiser,
)


def test_treasurer_adds_and_lists_invoices(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    treasurer = school.headers["treasurer"]
    parent = school.headers["parent"]

    payload = {
        "title": "FV 123/2026 - Bus rental",
        "amount": "250.00",
        "file_url": "/uploads/invoices/bus.pdf",
    }

    res = client.post(f"{URL}/{fundraiser_id}/invoices", headers=treasurer, json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == payload["title"]
    assert Decimal(data["amount"]) == Decimal("250.00")

    res_list = client.get(f"{URL}/{fundraiser_id}/invoices", headers=parent)
    assert res_list.status_code == 200
    invoices = res_list.json()
    assert len(invoices) == 1
    assert invoices[0]["title"] == payload["title"]


def test_parent_cannot_create_invoice(client, db, auth_headers):
    school = create_school_setup(db, auth_headers)
    fundraiser_id = create_test_fundraiser(client, school)
    parent = school.headers["parent"]

    payload = {
        "title": "FV Fake",
        "amount": "100.00",
        "file_url": "/uploads/invoices/fake.pdf",
    }
    res = client.post(f"{URL}/{fundraiser_id}/invoices", headers=parent, json=payload)
    assert res.status_code == 404
