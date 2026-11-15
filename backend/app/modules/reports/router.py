from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.reports.export import export_csv, export_pdf
from app.modules.reports.schemas import FinancialReport, ReportScope
from app.modules.reports.service import get_report
from app.modules.users.models import User

router = APIRouter(prefix="/reports", tags=["reports"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/{scope}/{subject_id}")
def read_report(
    scope: ReportScope, subject_id: UUID, user: CurrentUser, db: DbSession
) -> FinancialReport:
    return get_report(db, user, scope, subject_id)


@router.get(
    "/{scope}/{subject_id}/export",
    response_class=Response,
    responses={
        200: {
            "content": {
                "text/csv": {"schema": {"type": "string", "format": "binary"}},
                "application/pdf": {"schema": {"type": "string", "format": "binary"}},
            }
        }
    },
)
def download_report(
    scope: ReportScope,
    subject_id: UUID,
    user: CurrentUser,
    db: DbSession,
    file_format: Annotated[Literal["csv", "pdf"], Query(alias="format")],
) -> Response:
    report = get_report(db, user, scope, subject_id)
    if file_format == "csv":
        content, media_type = export_csv(report), "text/csv"
    else:
        content, media_type = export_pdf(report), "application/pdf"
    return Response(
        content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{scope}-{subject_id}.{file_format}"',
            "Cache-Control": "no-store",
        },
    )
