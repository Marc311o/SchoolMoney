from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.modules.accounts.enums import AccountType
from app.modules.accounts.models import Account
from app.modules.accounts.utils import generate_fake_iban
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import TokenRead, UserLogin, UserRegister


def register_user(db: Session, data: UserRegister) -> User:
    stmt = select(User).where(User.email == data.email)
    if db.execute(stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    user_id = uuid4()
    user = User(
        id=user_id,
        email=data.email,
        password_hash=hash_password(data.password),
        first_name=data.first_name,
        last_name=data.last_name,
        avatar_url=data.avatar_url,
        role=UserRole.PARENT,
        status=UserStatus.ACTIVE,
    )
    db.add(user)

    account = Account(
        id=uuid4(),
        iban=generate_fake_iban(),
        account_type=AccountType.USER,
        user_id=user_id,
        balance=Decimal("0.00"),
    )
    db.add(account)

    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, data: UserLogin) -> TokenRead:
    stmt = select(User).where(User.email == data.email)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == UserStatus.BLOCKED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is blocked",
        )

    token = create_access_token(subject=str(user.id))
    return TokenRead(access_token=token, token_type="bearer")


def get_user_by_id(db: Session, user_id: UUID) -> User | None:
    stmt = select(User).where(User.id == user_id)
    return db.execute(stmt).scalar_one_or_none()
