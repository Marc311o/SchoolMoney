from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.children import service
from app.modules.children.schemas import ChildCreate, ChildRead, ChildUpdate
from app.modules.users.dependencies import get_current_user
from app.modules.users.models import User

router = APIRouter(prefix="/children", tags=["children"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ChildRead], summary="List my children")
def list_children(user: CurrentUser, db: DbSession) -> list[ChildRead]:
    return service.list_children(db, user)


@router.post(
    "",
    response_model=ChildRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a child (restores a removed one if the same name and birth date)",
)
def create_child(data: ChildCreate, user: CurrentUser, db: DbSession) -> ChildRead:
    return service.create_child(db, user, data)


@router.get("/{child_id}", response_model=ChildRead, summary="Get one of my children")
def get_child(child_id: UUID, user: CurrentUser, db: DbSession) -> ChildRead:
    return service.get_child(db, user, child_id)


@router.patch("/{child_id}", response_model=ChildRead, summary="Update one of my children")
def update_child(child_id: UUID, data: ChildUpdate, user: CurrentUser, db: DbSession) -> ChildRead:
    return service.update_child(db, user, child_id, data)


@router.delete(
    "/{child_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove one of my children (kept in history as removed)",
    responses={409: {"description": "Child has payments in open fundraisers"}},
)
def remove_child(child_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    service.remove_child(db, user, child_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
