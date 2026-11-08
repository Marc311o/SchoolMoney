from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.fundraisers import service
from app.modules.fundraisers.schemas import FundraiserCreate, FundraiserRead, FundraiserUpdate
from app.modules.users.models import User

router = APIRouter(prefix="/fundraisers", tags=["fundraisers"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("")
def list_fundraisers(
    user: CurrentUser, db: DbSession, class_id: UUID | None = None
) -> list[FundraiserRead]:
    return service.list_fundraisers(db, user, class_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_fundraiser(
    payload: FundraiserCreate, user: CurrentUser, db: DbSession
) -> FundraiserRead:
    return service.create_fundraiser(db, user, payload)


@router.get("/{fundraiser_id}")
def get_fundraiser(fundraiser_id: UUID, user: CurrentUser, db: DbSession) -> FundraiserRead:
    return service.get_fundraiser(db, user, fundraiser_id)


@router.patch("/{fundraiser_id}")
def update_fundraiser(
    fundraiser_id: UUID, payload: FundraiserUpdate, user: CurrentUser, db: DbSession
) -> FundraiserRead:
    return service.update_fundraiser(db, user, fundraiser_id, payload)


@router.delete("/{fundraiser_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fundraiser(fundraiser_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    service.delete_fundraiser(db, user, fundraiser_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
