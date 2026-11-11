from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.common.schemas import Page
from app.core.database import get_db
from app.modules.admin import service
from app.modules.admin.schemas import AdminFundraiserRead, AdminUserRead
from app.modules.auth.dependencies import get_current_admin
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.schemas import FundraiserBlockUpdate
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


@router.get(
    "/fundraisers",
    response_model=Page[AdminFundraiserRead],
    summary="All fundraisers, with search and filters (admin only)",
)
def list_fundraisers(
    db: DbSession,
    q: Annotated[
        str | None, Query(max_length=100, description="Fundraiser, class or treasurer")
    ] = None,
    status: FundraiserStatus | None = None,
    blocked: bool | None = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 10,
) -> Page[AdminFundraiserRead]:
    return service.list_fundraisers(
        db,
        query=q,
        fundraiser_status=status,
        blocked=blocked,
        page=page,
        page_size=page_size,
    )


@router.patch(
    "/fundraisers/{fundraiser_id}",
    response_model=AdminFundraiserRead,
    summary="Block or unblock a fundraiser (admin only)",
    responses={404: {"description": "Fundraiser not found"}},
)
def set_fundraiser_blocked(
    fundraiser_id: UUID, data: FundraiserBlockUpdate, db: DbSession
) -> AdminFundraiserRead:
    return service.set_fundraiser_blocked(db, fundraiser_id, data)
