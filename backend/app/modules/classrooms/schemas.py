import re
from datetime import UTC, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import StrictBool, StringConstraints, field_validator, model_validator

from app.common.schemas import SchemaBase
from app.modules.children.schemas import ChildSummaryRead
from app.modules.classrooms.enums import ClassRole, MembershipStatus
from app.modules.users.schemas import UserSummaryRead

ClassName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
SchoolYear = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        pattern=r"^[0-9]{4}/[0-9]{4}$",
    ),
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
    school_year: SchoolYear | None = None
    append_school_year: StrictBool = False

    @field_validator("school_year")
    @classmethod
    def validate_school_year(cls, value: str | None) -> str | None:
        if value is None:
            return None

        start, end = map(int, value.split("/"))

        if not 1 <= start <= 9998 or end != start + 1:
            raise ValueError("school_year must contain consecutive years, e.g. 2026/2027")

        return value

    @model_validator(mode="after")
    def validate_name_with_school_year(self) -> "SchoolClassCreate":
        if self.append_school_year:
            if self.school_year is None:
                raise ValueError("school_year is required when append_school_year is true")

            if re.search(r"_\d{4}/\d{4}$", self.name):
                raise ValueError("Provide the class name without a school-year suffix")

            if len(self.name) > 90:
                raise ValueError(
                    "Class name must be at most 90 characters when appending a school year"
                )

        return self


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
    school_year_start: int | None
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


class ClassMemberWithParentRead(ClassMemberRead):
    """A child on the class list, with the parent to contact."""

    parent: UserSummaryRead


class ClassListItemRead(SchoolClassRead):
    my_role: ClassRole
    treasurer: UserSummaryRead
    my_children: list[ClassMemberRead]
    children_count: int


class ClassDetailRead(SchoolClassRead):
    my_role: ClassRole
    treasurer: UserSummaryRead
    children: list[ClassMemberWithParentRead]
