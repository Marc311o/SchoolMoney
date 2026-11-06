from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.repository import get_user_by_email, get_user_by_id
from app.modules.users.schemas import AdminUserEmailUpdate, UserUpdate


def update_user_profile(
    db: Session,
    user: User,
    data: UserUpdate,
) -> User:
    changes = data.model_dump(exclude_unset=True)

    if not changes:
        return user

    for field, value in changes.items():
        setattr(user, field, value)

    user.updated_at = datetime.now(UTC)

    db.commit()
    db.refresh(user)
    return user


def change_parent_email(
    db: Session,
    user_id: UUID,
    data: AdminUserEmailUpdate,
) -> User:
    user = get_user_by_id(db, user_id=user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.role != UserRole.PARENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email can only be changed for parent accounts",
        )

    existing_user = get_user_by_email(db, email=data.email)

    if existing_user is not None and existing_user.id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists",
        )

    user.email = data.email
    user.updated_at = datetime.now(UTC)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()

        constraint = getattr(
            getattr(exc.orig, "diag", None),
            "constraint_name",
            None,
        )

        if constraint == "uq_users_email":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists",
            ) from None

        raise

    db.refresh(user)
    return user


def search_parents_by_email(
    db: Session,
    email_query: str,
    limit: int = 10,
) -> list[User]:
    """Search active parents matching the email query."""
    clean_query = email_query.strip().lower()
    if not clean_query:
        return []

    return list(
        db.scalars(
            select(User)
            .where(
                User.role == UserRole.PARENT,
                User.status == UserStatus.ACTIVE,
                User.email.ilike(f"%{clean_query}%"),
            )
            .order_by(User.email)
            .limit(limit)
        ).all()
    )
