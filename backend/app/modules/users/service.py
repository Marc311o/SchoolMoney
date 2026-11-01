from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.users.models import User
from app.modules.users.repository import get_user_by_email
from app.modules.users.schemas import UserUpdate


def update_user_profile(
    db: Session,
    user: User,
    data: UserUpdate,
) -> User:
    changes = data.model_dump(exclude_unset=True)

    if not changes:
        return user

    if "email" in changes:
        existing_user = get_user_by_email(
            db,
            email=changes["email"],
        )

        if existing_user is not None and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists",
            )

    for field, value in changes.items():
        setattr(user, field, value)

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
