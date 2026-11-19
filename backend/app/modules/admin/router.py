from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.common.schemas import Page
from app.core.database import get_db
from app.modules.admin import service
from app.modules.admin.schemas import AdminFundraiserRead, AdminOverviewRead, AdminUserRead
from app.modules.auth.dependencies import get_current_admin
from app.modules.chat import service as chat_service
from app.modules.chat.schemas import ChatRead
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.schemas import FundraiserBlockUpdate
from app.modules.reports.export import export_csv, export_pdf
from app.modules.reports.schemas import ReportLanguage
from app.modules.reports.service import get_system_report
from app.modules.users.enums import UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import UserStatusUpdate

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

DbSession = Annotated[Session, Depends(get_db)]
CurrentAdmin = Annotated[User, Depends(get_current_admin)]


@router.get(
    "/overview",
    response_model=AdminOverviewRead,
    summary="Platform summary and aggregated system-wide financial report (admin only)",
)
def read_admin_overview(admin: CurrentAdmin, db: DbSession) -> AdminOverviewRead:
    return service.get_overview(db, admin)


@router.get(
    "/report/export",
    response_class=Response,
    summary="Download aggregated system-wide financial report (admin only)",
    responses={
        200: {
            "content": {
                "application/octet-stream": {"schema": {"type": "string", "format": "binary"}},
                "application/pdf": {"schema": {"type": "string", "format": "binary"}},
            }
        }
    },
)
def download_admin_system_report(
    admin: CurrentAdmin,
    db: DbSession,
    file_format: Annotated[Literal["csv", "pdf"], Query(alias="format")],
    lang: Annotated[ReportLanguage, Query(description="Language of the exported report")] = "pl",
) -> Response:
    report = get_system_report(db, admin)

    if file_format == "csv":
        content, media_type = export_csv(report, lang=lang), "application/octet-stream"
    else:
        content, media_type = export_pdf(report, lang=lang), "application/pdf"

    return Response(
        content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="system-report.{file_format}"',
            "Content-Language": lang,
            "Cache-Control": "no-store",
        },
    )


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


@router.post(
    "/treasurers/{user_id}/chat",
    response_model=ChatRead,
    summary="Open the chat with a treasurer (existing or new; admin only)",
    responses={404: {"description": "Treasurer not found"}},
)
def open_treasurer_chat(user_id: UUID, admin: CurrentAdmin, db: DbSession) -> ChatRead:
    return chat_service.open_treasurer_chat(db, admin, user_id)
