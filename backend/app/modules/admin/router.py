from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.schemas import Page
from app.core.database import get_db
from app.modules.admin import service
from app.modules.admin.schemas import AdminUserRead
from app.modules.auth.dependencies import get_current_admin
from app.modules.users.enums import UserStatus
from app.modules.users.schemas import UserStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

DbSession = Annotated[Session, Depends(get_db)]


@router.get(
    "/users",
    response_model=Page[AdminUserRead],
    summary="Parents, with search and filters (admin only)",
)
def list_users(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100, description="Name or email")] = None,
    status: UserStatus | None = None,
    treasurers: Annotated[bool, Query(description="Only parents who run a class")] = False,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> Page[AdminUserRead]:
    return service.list_users(
        db,
        query=q,
        user_status=status,
        treasurers_only=treasurers,
        page=page,
        page_size=page_size,
    )


@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserRead,
    summary="Block or unblock a parent (admin only)",
    responses={
        403: {"description": "Not an admin, or the target is an administrator"},
        404: {"description": "User not found"},
        409: {"description": "Account is not activated yet"},
    },
)
def set_user_status(user_id: UUID, data: UserStatusUpdate, db: DbSession) -> AdminUserRead:
    return service.set_user_status(db, user_id, data)
