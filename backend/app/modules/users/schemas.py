from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import EmailStr, field_validator, model_validator

from app.common.schemas import (
    AvatarUrl,
    Email,
    FirstName,
    LastName,
    SchemaBase,
    reject_explicit_nulls,
)
from app.modules.users.enums import UserRole, UserStatus


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
