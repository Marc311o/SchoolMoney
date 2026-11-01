from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.classrooms import service
from app.modules.classrooms.schemas import ClassDetailRead, ClassListItemRead
from app.modules.users.models import User

router = APIRouter(prefix="/classes", tags=["classes"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get(
    "",
    response_model=list[ClassListItemRead],
    summary="List my classes (as treasurer or as a parent)",
)
def list_classes(user: CurrentUser, db: DbSession) -> list[ClassListItemRead]:
    return service.list_classes(db, user)


@router.get(
    "/{class_id}",
    response_model=ClassDetailRead,
    summary="Get a class with its children and treasurer",
    responses={404: {"description": "Class not found or not visible to me"}},
)
def get_class(class_id: UUID, user: CurrentUser, db: DbSession) -> ClassDetailRead:
    return service.get_class(db, user, class_id)
