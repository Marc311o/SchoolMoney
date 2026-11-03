import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.accounts.helpers import REAL_IBAN, add_bank_account, user_id, wallet_row

URL = "/api/accounts/me/external-accounts"


def test_add_bank_account(client: TestClient, db: Session, parent):
    account = add_bank_account(client, parent, iban="pl10 1050 0099 7603 1234 5678 9123")

    assert account["iban"] == REAL_IBAN
    assert account["account_name"] == "My bank"
    assert account["user_id"] == str(user_id(db, "parent@example.com"))


def test_account_name_is_optional(client: TestClient, parent):
    assert add_bank_account(client, parent, account_name=None)["account_name"] is None


def test_list_shows_only_my_accounts(client: TestClient, parent, auth_headers):
    other = auth_headers("other@example.com")
    add_bank_account(client, other, iban="PL61109010140000071219812874")
    mine = add_bank_account(client, parent)

    response = client.get(URL, headers=parent)
    assert response.status_code == 200
    assert [account["id"] for account in response.json()] == [mine["id"]]


def test_same_account_twice_is_a_conflict(client: TestClient, parent):
    add_bank_account(client, parent)

    response = client.post(URL, json={"iban": "PL10 1050 0099 7603 1234 5678 9123"}, headers=parent)
    assert response.status_code == 409
    assert response.json()["detail"] == "You have already added this bank account"


def test_two_users_may_add_the_same_account(client: TestClient, parent, auth_headers):
    add_bank_account(client, parent)
    add_bank_account(client, auth_headers("spouse@example.com"))


@pytest.mark.parametrize(
    "iban",
    ["PL123", "1234567890123456789", "PL10-1050-0099-7603", ""],
    ids=["too short", "no country code", "dashes", "empty"],
)
def test_invalid_iban(client: TestClient, parent, iban):
    assert client.post(URL, json={"iban": iban}, headers=parent).status_code == 422


@pytest.mark.parametrize("whose", ["mine", "someone else's"])
def test_schoolmoney_wallet_number_is_refused(
    client: TestClient, db: Session, parent, auth_headers, whose
):
    auth_headers("other@example.com")
    email = "parent@example.com" if whose == "mine" else "other@example.com"
    wallet_iban = wallet_row(db, email).iban

    response = client.post(URL, json={"iban": wallet_iban}, headers=parent)
    assert response.status_code == 422
    assert "SchoolMoney account number" in response.json()["detail"]
    assert client.get(URL, headers=parent).json() == []
