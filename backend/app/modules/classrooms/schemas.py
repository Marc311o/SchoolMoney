from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import StringConstraints, field_validator, model_validator

from app.common.schemas import SchemaBase
from app.modules.classrooms.enums import MembershipStatus
from app.modules.users.schemas import ChildSummaryRead

ClassName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
SchoolName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
AccessCode = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
MembershipReviewStatus = Literal[MembershipStatus.ACTIVE, MembershipStatus.REJECTED]


def _reject_explicit_nulls(data: Any, fields: tuple[str, ...]) -> Any:
    if isinstance(data, dict):
        for field in fields:
            if field in data and data[field] is None:
                raise ValueError(f"{field} cannot be null")
    return data


class SchoolClassCreate(SchemaBase):
    name: ClassName
    school_name: SchoolName | None = None


class SchoolClassUpdate(SchemaBase):
    name: ClassName | None = None
    school_name: SchoolName | None = None

    @model_validator(mode="before")
    @classmethod
    def class_name_cannot_be_null(cls, data: Any) -> Any:
        return _reject_explicit_nulls(data, ("name",))


class SchoolClassRead(SchemaBase):
    id: UUID
    name: str
    school_name: str | None
    treasurer_id: UUID
    created_at: datetime


class ClassAccessCodeCreate(SchemaBase):
    valid_until: datetime | None = None

    @field_validator("valid_until")
    @classmethod
    def valid_until_must_be_future(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("valid_until must include timezone information")
        if value <= datetime.now(UTC):
            raise ValueError("valid_until must be in the future")
        return value


class ClassAccessCodeUpdate(SchemaBase):
    valid_until: datetime | None = None
    active: bool | None = None

    @model_validator(mode="before")
    @classmethod
    def active_cannot_be_null(cls, data: Any) -> Any:
        return _reject_explicit_nulls(data, ("active",))

    @field_validator("valid_until")
    @classmethod
    def valid_until_must_be_future(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return value
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("valid_until must include timezone information")
        if value <= datetime.now(UTC):
            raise ValueError("valid_until must be in the future")
        return value


class ClassAccessCodeRead(SchemaBase):
    id: UUID
    class_id: UUID
    code: str
    valid_until: datetime | None
    active: bool
    created_at: datetime


class ClassJoinRequest(SchemaBase):
    child_id: UUID
    code: AccessCode


class MembershipReviewRequest(SchemaBase):
    status: MembershipReviewStatus


class ChildClassMembershipRead(SchemaBase):
    id: UUID
    child_id: UUID
    class_id: UUID
    status: MembershipStatus
    requested_at: datetime
    joined_at: datetime | None
    left_at: datetime | None


class ClassMemberRead(ChildClassMembershipRead):
    child: ChildSummaryRead
