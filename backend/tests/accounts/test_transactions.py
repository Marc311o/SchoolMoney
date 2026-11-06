from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from tests.accounts.helpers import add_bank_account, top_up

URL = "/api/accounts/me/transactions"


def test_transactions_requires_auth(client: TestClient):
    assert client.get(URL).status_code == 401


def test_new_wallet_has_no_transactions(client: TestClient, parent):
    response = client.get(URL, headers=parent)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1
    assert data["pages"] == 0


def test_transactions_record_top_up_and_transfer(client: TestClient, parent):
    top_up(client, parent, "100.00")
    bank = add_bank_account(client, parent)
    client.post(
        "/api/accounts/me/external-transfers",
        json={"external_account_id": bank["id"], "amount": "40.00", "description": "Rent"},
        headers=parent,
    )

    response = client.get(URL, headers=parent)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2

    types = [t["type"] for t in data["items"]]
    assert "EXTERNAL_TRANSFER" in types
    assert "TOP_UP" in types

    transfer_item = next(t for t in data["items"] if t["type"] == "EXTERNAL_TRANSFER")
    assert Decimal(transfer_item["amount"]) == Decimal("40.00")
    assert transfer_item["description"] == "Rent"

    topup_item = next(t for t in data["items"] if t["type"] == "TOP_UP")
    assert Decimal(topup_item["amount"]) == Decimal("100.00")


def test_transactions_pagination(client: TestClient, parent):
    for i in range(5):
        top_up(client, parent, f"{i + 1}.00")

    resp1 = client.get(f"{URL}?page=1&page_size=2", headers=parent)
    assert resp1.status_code == 200
    d1 = resp1.json()
    assert d1["total"] == 5
    assert len(d1["items"]) == 2
    assert d1["page"] == 1
    assert d1["page_size"] == 2
    assert d1["pages"] == 3

    resp3 = client.get(f"{URL}?page=3&page_size=2", headers=parent)
    assert resp3.status_code == 200
    d3 = resp3.json()
    assert len(d3["items"]) == 1
    assert d3["page"] == 3


def test_transactions_only_shows_my_history(client: TestClient, parent, auth_headers):
    other = auth_headers("other@example.com")
    top_up(client, other, "50.00")
    top_up(client, parent, "25.00")

    response = client.get(URL, headers=parent)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert Decimal(data["items"][0]["amount"]) == Decimal("25.00")


@pytest.mark.parametrize(
    ("page", "page_size"),
    [(0, 10), (-1, 10), (1, 0), (1, 101)],
    ids=["page zero", "negative page", "zero page_size", "page_size over limit"],
)
def test_pagination_validation(client: TestClient, parent, page, page_size):
    response = client.get(f"{URL}?page={page}&page_size={page_size}", headers=parent)
    assert response.status_code == 422
