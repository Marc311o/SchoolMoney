from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.users.dependencies import get_current_user
from app.modules.users.models import User
from app.modules.users.schemas import (
    RefreshTokenRequest,
    TokenRead,
    UserLogin,
    UserRead,
    UserRegister,
)
from app.modules.users.service import (
    authenticate_user,
    refresh_user_tokens,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new parent user",
)
def register(
    data: UserRegister,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    return register_user(db=db, data=data)


@router.post(
    "/login",
    response_model=TokenRead,
    summary="Login and obtain access and refresh tokens",
)
def login(
    data: UserLogin,
    db: Annotated[Session, Depends(get_db)],
) -> TokenRead:
    return authenticate_user(db=db, data=data)


@router.post(
    "/refresh",
    response_model=TokenRead,
    summary="Refresh access and refresh tokens",
)
def refresh(
    data: RefreshTokenRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenRead:
    return refresh_user_tokens(db=db, refresh_token=data.refresh_token)


@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user info",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    return current_user
