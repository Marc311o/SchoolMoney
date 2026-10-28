from uuid import UUID, uuid4

import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.modules.accounts.enums import AccountType
from app.modules.accounts.models import Account
from app.modules.accounts.utils import generate_fake_iban
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import TokenRead, UserLogin, UserRegister


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def register_user(db: Session, data: UserRegister) -> User:
    existing_user = get_user_by_email(db, email=data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    user = User(
        id=uuid4(),
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        avatar_url=str(data.avatar_url) if data.avatar_url else None,
        role=UserRole.PARENT,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()

    account = Account(
        id=uuid4(),
        user_id=user.id,
        iban=generate_fake_iban(),
        account_type=AccountType.USER,
    )
    db.add(account)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, data: UserLogin) -> TokenRead:
    user = get_user_by_email(db, email=data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    return TokenRead(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        token_type="bearer",
    )


def refresh_user_tokens(db: Session, refresh_token: str) -> TokenRead:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
        user_id_str: str | None = payload.get("sub")
        if not user_id_str:
            raise credentials_exception
        user_id = UUID(user_id_str)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exception from None

    user = get_user_by_id(db, user_id=user_id)
    if not user:
        raise credentials_exception
    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    return TokenRead(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        token_type="bearer",
    )
