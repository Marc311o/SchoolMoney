from datetime import date, datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import EmailStr, Field, StringConstraints, field_validator, model_validator

from app.common.schemas import SchemaBase
from app.modules.users.enums import UserRole, UserStatus

FirstName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
LastName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
AvatarUrl = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]
Password = Annotated[str, Field(min_length=8, max_length=128)]
Email = Annotated[EmailStr, Field(max_length=255)]


def _reject_explicit_nulls(data: Any, fields: tuple[str, ...]) -> Any:
    """PATCH helper: omitted is allowed, explicit null is not for DB NOT NULL fields."""
    if isinstance(data, dict):
        for field in fields:
            if field in data and data[field] is None:
                raise ValueError(f"{field} cannot be null")
    return data


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
    token_type: str = "bearer"


class UserUpdate(SchemaBase):
    """Editable profile fields for the currently authenticated user."""

    email: Email | None = None
    first_name: FirstName | None = None
    last_name: LastName | None = None
    avatar_url: AvatarUrl | None = None

    @model_validator(mode="before")
    @classmethod
    def non_nullable_profile_fields(cls, data: Any) -> Any:
        return _reject_explicit_nulls(data, ("email", "first_name", "last_name"))

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


class ChildCreate(SchemaBase):
    """Create a child owned by the authenticated parent.

    `parent_id` is intentionally absent: it must come from the authenticated user.
    """

    first_name: FirstName
    last_name: LastName
    birth_date: date | None = None
    avatar_url: AvatarUrl | None = None

    @field_validator("birth_date")
    @classmethod
    def birth_date_cannot_be_future(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("birth_date cannot be in the future")
        return value


class ChildUpdate(SchemaBase):
    first_name: FirstName | None = None
    last_name: LastName | None = None
    birth_date: date | None = None
    avatar_url: AvatarUrl | None = None

    @model_validator(mode="before")
    @classmethod
    def non_nullable_names(cls, data: Any) -> Any:
        return _reject_explicit_nulls(data, ("first_name", "last_name"))

    @field_validator("birth_date")
    @classmethod
    def birth_date_cannot_be_future(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("birth_date cannot be in the future")
        return value


class ChildSummaryRead(SchemaBase):
    id: UUID
    parent_id: UUID
    first_name: str
    last_name: str
    avatar_url: str | None


class ChildRead(ChildSummaryRead):
    birth_date: date | None
    created_at: datetime


class UserWithChildrenRead(UserRead):
    children: list[ChildRead] = Field(default_factory=list)
