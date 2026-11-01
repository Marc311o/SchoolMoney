from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.users import service
from app.modules.users.models import User
from app.modules.users.schemas import UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


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
