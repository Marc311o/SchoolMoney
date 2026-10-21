import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from app.core.database import get_db
from app.main import app


class BrokenSession:
    """Session stand-in that fails like an unreachable database."""

    def execute(self, *args, **kwargs):
        raise OperationalError("SELECT 1", {}, ConnectionRefusedError("connection refused"))


def test_health(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_returns_503_when_database_is_down(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    app.dependency_overrides[get_db] = lambda: BrokenSession()

    with caplog.at_level(logging.ERROR):
        response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
    assert any("health check failed" in r.getMessage() for r in caplog.records)
