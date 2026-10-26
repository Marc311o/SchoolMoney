from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.modules.classrooms.enums import MembershipStatus


class SchoolClass(Base):
    __tablename__ = "classes"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    school_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    treasurer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ClassAccessCode(Base):
    __tablename__ = "class_access_codes"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    class_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id"),
        nullable=False,
    )

    code: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
    )

    valid_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class ChildClassMembership(Base):
    __tablename__ = "child_class_memberships"

    __table_args__ = (
        UniqueConstraint(
            "child_id",
            "class_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    child_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("children.id"),
        nullable=False,
    )

    class_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id"),
        nullable=False,
    )

    status: Mapped[MembershipStatus] = mapped_column(
        SAEnum(
            MembershipStatus,
            name="membership_status",
        ),
        nullable=False,
        server_default=text("'PENDING'"),
    )

    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    joined_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    left_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )