from fastapi.testclient import TestClient


def test_user_search_for_class_invites_is_removed(client: TestClient, parent):
    response = client.get("/api/users/search", params={"email": "example.com"}, headers=parent)
    assert response.status_code == 404
