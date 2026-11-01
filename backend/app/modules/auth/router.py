from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, get_current_admin
from app.modules.auth.schemas import (
    AuthMeRead,
    PasswordChange,
    RefreshTokenRequest,
    TokenRead,
    UserLogin,
    UserRegister,
    PasswordResetConfirm,
)
from app.modules.auth.service import (
    authenticate_user,
    change_user_password,
    refresh_user_tokens,
    register_user,
    confirm_password_reset,
    request_password_reset,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserRead
from uuid import UUID

from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/auth", tags=["auth"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new parent user",
)
def register(data: UserRegister, db: DbSession) -> User:
    return register_user(db=db, data=data)


@router.post(
    "/login",
    response_model=TokenRead,
    summary="Login and obtain access and refresh tokens",
)
def login(data: UserLogin, db: DbSession) -> TokenRead:
    return authenticate_user(db=db, data=data)


@router.post(
    "/refresh",
    response_model=TokenRead,
    summary="Refresh access and refresh tokens",
)
def refresh(data: RefreshTokenRequest, db: DbSession) -> TokenRead:
    return refresh_user_tokens(
        db=db,
        refresh_token=data.refresh_token,
    )


@router.get(
    "/me",
    response_model=AuthMeRead,
    summary="Get current identity and authorization state",
)
def get_me(user: CurrentUser) -> User:
    return user


@router.patch(
    "/password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change my password",
)
def change_my_password(
        data: PasswordChange,
        user: CurrentUser,
        db: DbSession,
) -> Response:
    change_user_password(db=db, user=user, data=data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post(
    "/users/{user_id}/password-reset",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Send a password reset email (admin only)",
)
def send_reset_link(
    user_id: UUID,
    admin: Annotated[User, Depends(get_current_admin)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    request_password_reset(
        db=db,
        user_id=user_id,
        admin=admin,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/password-reset/confirm",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Set a new password using a one-time reset token",
)
def reset_password(
    data: PasswordResetConfirm,
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    confirm_password_reset(db=db, data=data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

