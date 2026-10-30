"""
Test database
    `<POSTGRES_DB>_test` on the same server as the development database.
    Created automatically if missing.

Isolation
    Every test runs inside a transaction that is ROLLED BACK at the end.

Where things live
    conftest.py    fixtures pytest injects by name (db, client, auth_headers, parent)
    factories.py   make_* functions that put rows straight into the database
"""

from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

TEST_DB_NAME = f"{settings.POSTGRES_DB}_test"
TEST_DB_URL = make_url(settings.DATABASE_URL).set(database=TEST_DB_NAME)


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------


def _create_test_database_if_missing() -> None:
    admin = create_engine(
        make_url(settings.DATABASE_URL).set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    try:
        with admin.connect() as conn:
            exists = conn.scalar(
                text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": TEST_DB_NAME}
            )
            if not exists:
                conn.execute(text(f'CREATE DATABASE "{TEST_DB_NAME}"'))
    finally:
        admin.dispose()


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    _create_test_database_if_missing()
    engine = create_engine(TEST_DB_URL)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    """Session inside a transaction that is rolled back after the test."""
    with engine.connect() as conn:
        transaction = conn.begin()
        session = Session(bind=conn, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()


# ---------------------------------------------------------------------------
# HTTP client
# ---------------------------------------------------------------------------


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    """Client that calls the app directly (no network), using the test session."""
    app.dependency_overrides[get_db] = lambda: db
    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

PASSWORD = "safePassword123!"

AuthHeaders = Callable[[str], dict[str, str]]


@pytest.fixture
def auth_headers(client: TestClient) -> AuthHeaders:
    """Register a parent with the given email and return their Authorization header.

    Usage: headers = auth_headers("anna@example.com")
    """

    def _auth_headers(email: str) -> dict[str, str]:
        client.post(
            "/api/auth/register",
            json={"email": email, "password": PASSWORD, "first_name": "Anna", "last_name": "Kot"},
        )
        tokens = client.post("/api/auth/login", json={"email": email, "password": PASSWORD}).json()
        return {"Authorization": f"Bearer {tokens['access_token']}"}

    return _auth_headers


@pytest.fixture
def parent(auth_headers: AuthHeaders) -> dict[str, str]:
    """Authorization header of a freshly registered parent."""
    return auth_headers("parent@example.com")
