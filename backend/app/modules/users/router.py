from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_admin, get_current_user
from app.modules.users import service
from app.modules.users.models import User
from app.modules.users.schemas import (
    AdminUserEmailUpdate,
    ParentSearchResult,
    UserRead,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(get_current_admin)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get(
    "/search",
    response_model=list[ParentSearchResult],
    summary="Search parents by email",
)
def search_parents(
    email: Annotated[
        str,
        Query(
            min_length=2,
            description="Email substring to search for (case-insensitive)",
        ),
    ],
    _user: CurrentUser,
    db: DbSession,
) -> list[User]:
    return service.search_parents_by_email(db=db, email_query=email)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get my profile",
)
def get_me(user: CurrentUser) -> User:
    return user


@router.patch(
    "/me",
    response_model=UserRead,
    summary="Update my profile",
)
def update_me(
    data: UserUpdate,
    user: CurrentUser,
    db: DbSession,
) -> User:
    return service.update_user_profile(
        db=db,
        user=user,
        data=data,
    )


@router.patch(
    "/{user_id}/email",
    response_model=UserRead,
    summary="Change a parent's email (admin only)",
)
def change_parent_email(
    user_id: UUID,
    data: AdminUserEmailUpdate,
    _admin: AdminUser,
    db: DbSession,
) -> User:
    return service.change_parent_email(
        db=db,
        user_id=user_id,
        data=data,
    )
