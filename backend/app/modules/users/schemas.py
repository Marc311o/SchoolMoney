from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import EmailStr, Field, field_validator, model_validator

from app.common.schemas import AvatarUrl, FirstName, LastName, SchemaBase, reject_explicit_nulls
from app.modules.users.enums import UserRole, UserStatus

Password = Annotated[str, Field(min_length=8, max_length=128)]
Email = Annotated[EmailStr, Field(max_length=255)]


class UserRegister(SchemaBase):
    """Public parent registration payload.

    `role`, `status`, `password_hash`, account ID and timestamps are server-owned.
    A normal registration must create a PARENT/ACTIVE user and hash `password`.
    """

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


class UserUpdate(SchemaBase):
    """Editable profile fields for the currently authenticated user."""

    email: Email | None = None
    first_name: FirstName | None = None
    last_name: LastName | None = None
    avatar_url: AvatarUrl | None = None

    @model_validator(mode="before")
    @classmethod
    def non_nullable_profile_fields(cls, data: Any) -> Any:
        return reject_explicit_nulls(data, ("email", "first_name", "last_name"))

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().lower()
        return value


class PasswordChange(SchemaBase):
    current_password: Password
    new_password: Password

    @model_validator(mode="after")
    def passwords_must_differ(self) -> "PasswordChange":
        if self.current_password == self.new_password:
            raise ValueError("new_password must be different from current_password")
        return self


class UserStatusUpdate(SchemaBase):
    """Admin action used to block/unblock a user account."""

    status: UserStatus


class UserSummaryRead(SchemaBase):
    id: UUID
    first_name: str
    last_name: str
    avatar_url: str | None


class UserRead(SchemaBase):
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    avatar_url: str | None
    role: UserRole
    status: UserStatus
    created_at: datetime
    updated_at: datetime | None
