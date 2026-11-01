from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode, urlsplit
from uuid import UUID, uuid4

import jwt
from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.modules.accounts.enums import AccountType
from app.modules.accounts.models import Account
from app.modules.accounts.utils import generate_fake_iban
from app.modules.auth.config import settings
from app.modules.auth.mailer import (
    EmailDeliveryError,
    send_account_activation_email,
    send_password_reset_email,
)
from app.modules.auth.models import AccountActivationToken, PasswordResetToken
from app.modules.auth.schemas import (
    AccountActivationConfirm,
    PasswordChange,
    PasswordResetConfirm,
    TokenRead,
    UserLogin,
    UserRegister,
)
from app.modules.auth.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_reset_token,
    verify_password,
)
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_email, get_user_by_id


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
        status=UserStatus.PENDING_ACTIVATION,
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

    raw_token = create_password_reset_token()
    token_hash = hash_reset_token(raw_token)

    db.add(
        AccountActivationToken(
            user_id=user.id,
            token_hash=token_hash,
            email=user.email,
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.ACCOUNT_ACTIVATION_EXPIRE_MINUTES),
        )
    )
    db.flush()

    activation_url = (
        urlsplit(str(settings.ACCOUNT_ACTIVATION_URL))
        ._replace(fragment=urlencode({"token": raw_token}))
        .geturl()
    )

    try:
        send_account_activation_email(user.email, activation_url)
    except EmailDeliveryError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send activation email",
        ) from None

    db.commit()
    db.refresh(user)

    return user


def activate_user_account(db: Session, data: AccountActivationConfirm) -> None:
    invalid_token = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired activation token",
    )

    token_hash = hash_reset_token(data.token)

    activation_record = db.scalar(
        select(AccountActivationToken).where(AccountActivationToken.token_hash == token_hash)
    )

    if activation_record is None:
        raise invalid_token

    user = db.scalar(
        select(User)
        .where(User.id == activation_record.user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    if user is None:
        raise invalid_token

    consumed = db.scalar(
        delete(AccountActivationToken)
        .where(
            AccountActivationToken.user_id == user.id,
            AccountActivationToken.token_hash == token_hash,
            AccountActivationToken.expires_at > datetime.now(UTC),
        )
        .returning(AccountActivationToken.user_id)
        .execution_options(synchronize_session="fetch")
    )

    if consumed is None:
        raise invalid_token

    user.status = UserStatus.ACTIVE
    user.updated_at = datetime.now(UTC)

    db.commit()


def authenticate_user(db: Session, data: UserLogin) -> TokenRead:
    user = get_user_by_email(db, email=data.email)

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.status == UserStatus.PENDING_ACTIVATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not activated",
        )

    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    return TokenRead(
        access_token=create_access_token(
            user.id,
            token_version=user.token_version,
        ),
        refresh_token=create_refresh_token(
            user.id,
            token_version=user.token_version,
        ),
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

    if user is None or payload.get("ver", 0) != user.token_version:
        raise credentials_exception

    if user.status == UserStatus.PENDING_ACTIVATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not activated",
        )

    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    return TokenRead(
        access_token=create_access_token(
            user.id,
            token_version=user.token_version,
        ),
        refresh_token=create_refresh_token(
            user.id,
            token_version=user.token_version,
        ),
        token_type="bearer",
    )


def change_user_password(
    db: Session,
    user: User,
    data: PasswordChange,
) -> None:
    db.refresh(user, with_for_update=True)

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    user.password_hash = hash_password(data.new_password)
    user.token_version += 1
    user.updated_at = datetime.now(UTC)

    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))

    db.commit()


def request_password_reset(
    db: Session,
    user_id: UUID,
    admin: User,
) -> None:
    user = db.scalar(
        select(User)
        .where(User.id == user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    raw_token = create_password_reset_token()

    db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))

    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw_token),
            email=user.email,
            token_version=user.token_version,
            requested_by=admin.id,
            expires_at=datetime.now(UTC)
            + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
        )
    )

    db.flush()

    reset_url = (
        urlsplit(str(settings.PASSWORD_RESET_URL))
        ._replace(fragment=urlencode({"token": raw_token}))
        .geturl()
    )

    try:
        send_password_reset_email(user.email, reset_url)
    except EmailDeliveryError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not send reset email",
        ) from None

    db.commit()


def confirm_password_reset(
    db: Session,
    data: PasswordResetConfirm,
) -> None:
    invalid_token = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid or expired reset token",
    )

    token_hash = hash_reset_token(data.token)

    reset = db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))

    if reset is None:
        raise invalid_token

    user = db.scalar(
        select(User)
        .where(User.id == reset.user_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    if user is None or user.status != UserStatus.ACTIVE:
        raise invalid_token

    consumed = db.scalar(
        delete(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.email == user.email,
            PasswordResetToken.token_version == user.token_version,
            PasswordResetToken.expires_at > datetime.now(UTC),
        )
        .returning(PasswordResetToken.user_id)
        .execution_options(synchronize_session="fetch")
    )

    if consumed is None:
        raise invalid_token

    user.password_hash = hash_password(data.new_password)
    user.token_version += 1
    user.updated_at = datetime.now(UTC)

    db.commit()
