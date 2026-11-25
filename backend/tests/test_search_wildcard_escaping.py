from fastapi.testclient import TestClient


def test_wildcard_queries_do_not_dump_all_records(client: TestClient, admin, parent, auth_headers):
    other_parent = auth_headers("anna.nowak@example.com")

    # 1. Admin users search: "%%", "%", "_" must not match arbitrary users
    for wildcard in ("%%", "%", "_"):
        res = client.get("/api/admin/users", params={"q": wildcard}, headers=admin)
        assert res.status_code == 200, res.text
        assert res.json()["items"] == []

    # 2. Chat contact search (min_length=2): "%%" and "__" must not return other parents
    for wildcard in ("%%", "__"):
        res = client.get("/api/chats/contacts", params={"q": wildcard}, headers=parent)
        assert res.status_code == 200, res.text
        assert res.json() == []

    # 3. Class invite email search (while still present): "%%" must not return users
    for wildcard in ("%%", "__"):
        res = client.get(
            "/api/users/parents/search", params={"email": wildcard}, headers=other_parent
        )
        if res.status_code == 200:
            assert res.json() == []
