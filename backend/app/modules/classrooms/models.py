from datetime import datetime
from uuid import UUID

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

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

    treasurer = relationship(
        "User",
        back_populates="classes_as_treasurer",
    )

    access_codes = relationship(
        "ClassAccessCode",
        back_populates="school_class",
    )

    memberships = relationship(
        "ChildClassMembership",
        back_populates="school_class",
    )

    fundraisers = relationship(
        "Fundraiser",
        back_populates="school_class",
    )

    chats = relationship(
        "Chat",
        back_populates="school_class",
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

    school_class = relationship(
        "SchoolClass",
        back_populates="access_codes",
    )


class ChildClassMembership(Base):
    __tablename__ = "child_class_memberships"

    __table_args__ = (
        UniqueConstraint(
            "child_id",
            "class_id",
        ),
        # A child belongs to at most one class at a time (finished memberships are history)
        Index(
            "uq_child_class_memberships_one_current_class",
            "child_id",
            unique=True,
            postgresql_where=text("status IN ('ACTIVE', 'PENDING')"),
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

    child = relationship(
        "Child",
        back_populates="class_memberships",
    )

    school_class = relationship(
        "SchoolClass",
        back_populates="memberships",
    )
