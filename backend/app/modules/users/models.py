from datetime import date, datetime
from uuid import UUID

from sqlalchemy import (
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.users.enums import UserRole, UserStatus


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    role: Mapped[UserRole] = mapped_column(
        SAEnum(
            UserRole,
            name="user_role",
        ),
        nullable=False,
        server_default=text("'PARENT'"),
    )

    status: Mapped[UserStatus] = mapped_column(
        SAEnum(
            UserStatus,
            name="user_status",
        ),
        nullable=False,
        server_default=text("'ACTIVE'"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


    children = relationship(
        "Child",
        back_populates="parent",
    )

    classes_as_treasurer = relationship(
        "SchoolClass",
        back_populates="treasurer",
    )

    account = relationship(
        "Account",
        back_populates="user",
        uselist=False,
    )

    external_bank_accounts = relationship(
        "ExternalBankAccount",
        back_populates="user",
    )

    transactions_created = relationship(
        "Transaction",
        back_populates="creator",
    )

    fundraisers_authored = relationship(
        "Fundraiser",
        back_populates="author",
    )

    fundraiser_payments = relationship(
        "FundraiserPayment",
        back_populates="payer",
    )

    treasurer_operations = relationship(
        "TreasurerOperation",
        back_populates="author",
    )

    invoices_added = relationship(
        "Invoice",
        back_populates="added_by_user",
    )

    chat_participations = relationship(
        "ChatParticipant",
        back_populates="user",
    )

    messages_sent = relationship(
        "Message",
        back_populates="sender",
    )


class Child(Base):
    __tablename__ = "children"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    parent_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    birth_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )

    avatar_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    parent = relationship(
        "User",
        back_populates="children",
    )

    class_memberships = relationship(
        "ChildClassMembership",
        back_populates="child",
    )

    fundraiser_obligations = relationship(
        "FundraiserObligation",
        back_populates="child",
    )

    fundraiser_payments = relationship(
        "FundraiserPayment",
        back_populates="child",
    )
