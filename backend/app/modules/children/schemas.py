from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import Field, computed_field, field_validator, model_validator

from app.common.schemas import AvatarUrl, FirstName, LastName, SchemaBase, reject_explicit_nulls
from app.modules.classrooms.enums import MembershipStatus


class ChildCreate(SchemaBase):
    """Create a child owned by the authenticated parent."""

    first_name: FirstName
    last_name: LastName
    birth_date: date
    avatar_url: AvatarUrl | None = None

    @field_validator("birth_date")
    @classmethod
    def birth_date_cannot_be_future(cls, value: date) -> date:
        if value > date.today():
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
        return reject_explicit_nulls(data, ("first_name", "last_name", "birth_date"))

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
    deleted_at: datetime | None = Field(default=None, exclude=True)

    @computed_field
    @property
    def removed(self) -> bool:
        """True for a child the parent has removed; shown as "(removed)" in history."""
        return self.deleted_at is not None


class ChildClassRead(SchemaBase):
    """The class a child currently belongs to (or is waiting to join)."""

    id: UUID
    name: str
    status: MembershipStatus


class ChildRead(ChildSummaryRead):
    birth_date: date
    created_at: datetime
    school_class: ChildClassRead | None = None
