from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Any

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.modules.auth.config import settings

password_hasher = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hasher.verify(plain_password, hashed_password)


def _create_token(
    subject: str | Any,
    token_type: str,
    expires_delta: timedelta,
    *,
    token_version: int = 0,
) -> str:
    expire = datetime.now(UTC) + expires_delta
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": token_type,
        "ver": token_version,
    }
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    *,
    token_version: int = 0,
) -> str:
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(
        subject,
        "access",
        delta,
        token_version=token_version,
    )


def create_refresh_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    *,
    token_version: int = 0,
) -> str:
    delta = expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(
        subject,
        "refresh",
        delta,
        token_version=token_version,
    )


def decode_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "sub", "type"]},
    )
    token_type = payload.get("type")
    if token_type != expected_type:
        raise jwt.InvalidTokenError(
            f"Invalid token type: expected {expected_type}, got {token_type}"
        )
    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    return decode_token(token, expected_type="access")


def create_password_reset_token() -> str:
    return token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
