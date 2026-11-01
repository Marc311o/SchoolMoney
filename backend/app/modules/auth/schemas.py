from typing import Annotated
from uuid import UUID

from pydantic import Field, field_validator, model_validator

from app.common.schemas import AvatarUrl, Email, FirstName, LastName, SchemaBase
from app.modules.users.enums import UserRole, UserStatus

Password = Annotated[str, Field(min_length=8, max_length=128)]


class UserRegister(SchemaBase):
    email: Email
    password: Password
    first_name: FirstName
    last_name: LastName
    avatar_url: AvatarUrl | None = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class UserLogin(SchemaBase):
    email: Email
    password: Password

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class TokenRead(SchemaBase):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(SchemaBase):
    refresh_token: str


class PasswordChange(SchemaBase):
    current_password: Password
    new_password: Password

    @model_validator(mode="after")
    def passwords_must_differ(self) -> "PasswordChange":
        if self.current_password == self.new_password:
            raise ValueError("new_password must be different from current_password")
        return self


class AuthMeRead(SchemaBase):
    id: UUID
    role: UserRole
    status: UserStatus


class PasswordResetConfirm(SchemaBase):
    token: Annotated[
        str,
        Field(
            min_length=43,
            max_length=43,
            pattern=r"^[A-Za-z0-9_-]{43}$",
        ),
    ]
    new_password: Password


class AccountActivationConfirm(SchemaBase):
    token: Annotated[
        str,
        Field(
            min_length=32,
            max_length=64,
            pattern=r"^[A-Za-z0-9_-]+$",
        ),
    ]
