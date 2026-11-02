from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.classrooms import service
from app.modules.classrooms.schemas import (
    ChildClassMembershipRead,
    ClassAccessCodeCreate,
    ClassAccessCodeRead,
    ClassDetailRead,
    ClassJoinRequest,
    ClassListItemRead,
    SchoolClassCreate,
    SchoolClassRead,
)
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


@router.post(
    "",
    response_model=SchoolClassRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a class (creator becomes treasurer)",
)
def create_class(
    payload: SchoolClassCreate,
    user: CurrentUser,
    db: DbSession,
) -> SchoolClassRead:
    return service.create_class(db, user, payload)


@router.get(
    "/{class_id}/access-code",
    response_model=ClassAccessCodeRead | None,
    summary="Get the active class access code (treasurer only)",
    responses={404: {"description": "Class not found or I am not its treasurer"}},
)
def get_access_code(
    class_id: UUID,
    user: CurrentUser,
    db: DbSession,
    response: Response,
) -> ClassAccessCodeRead | None:
    response.headers["Cache-Control"] = "no-store"
    return service.get_access_code(db, user, class_id)


@router.post(
    "/{class_id}/access-code",
    response_model=ClassAccessCodeRead,
    status_code=status.HTTP_201_CREATED,
    summary="Generate or regenerate a class access code (treasurer only)",
    responses={404: {"description": "Class not found or I am not its treasurer"}},
)
def regenerate_access_code(
    class_id: UUID,
    data: ClassAccessCodeCreate,
    user: CurrentUser,
    db: DbSession,
    response: Response,
) -> ClassAccessCodeRead:
    response.headers["Cache-Control"] = "no-store"
    return service.regenerate_access_code(db, user, class_id, data)


@router.post(
    "/join",
    response_model=ChildClassMembershipRead,
    status_code=status.HTTP_201_CREATED,
    summary="Request to join a class using an access code",
    responses={
        404: {"description": "Invalid/expired access code or child not found"},
        409: {"description": "Child already in a class or pending approval"},
    },
)
def join_class(
    payload: ClassJoinRequest,
    user: CurrentUser,
    db: DbSession,
) -> ChildClassMembershipRead:
    return service.join_class(db, user, payload)
