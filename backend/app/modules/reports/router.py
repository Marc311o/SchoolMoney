from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
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
