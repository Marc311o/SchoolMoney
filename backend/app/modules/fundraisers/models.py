from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.fundraisers.enums import (
    FundraiserStatus,
    TreasurerOperationDirection,
)


class Fundraiser(Base):
    __tablename__ = "fundraisers"

    __table_args__ = (
        CheckConstraint(
            "required_amount > 0",
            name="fundraiser_amount_positive",
        ),
        CheckConstraint(
            "end_date >= start_date",
            name="fundraiser_dates_valid",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    class_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id"),
        nullable=False,
    )

    author_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    logo_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    required_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    start_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    end_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )

    status: Mapped[FundraiserStatus] = mapped_column(
        SAEnum(
            FundraiserStatus,
            name="fundraiser_status",
        ),
        nullable=False,
        server_default=text("'DRAFT'"),
    )

    is_blocked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    school_class = relationship(
        "SchoolClass",
        back_populates="fundraisers",
    )

    author = relationship(
        "User",
        back_populates="fundraisers_authored",
    )

    account = relationship(
        "Account",
        back_populates="fundraiser",
        uselist=False,
    )

    obligations = relationship(
        "FundraiserObligation",
        back_populates="fundraiser",
    )

    payments = relationship(
        "FundraiserPayment",
        back_populates="fundraiser",
    )

    treasurer_operations = relationship(
        "TreasurerOperation",
        back_populates="fundraiser",
    )

    invoices = relationship(
        "Invoice",
        back_populates="fundraiser",
    )


class FundraiserObligation(Base):
    __tablename__ = "fundraiser_obligations"

    __table_args__ = (
        UniqueConstraint(
            "fundraiser_id",
            "child_id",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    fundraiser_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fundraisers.id"),
        nullable=False,
    )

    child_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("children.id"),
        nullable=False,
    )

    required_amount_per_child: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    fundraiser = relationship(
        "Fundraiser",
        back_populates="obligations",
    )

    child = relationship(
        "Child",
        back_populates="fundraiser_obligations",
    )


class FundraiserPayment(Base):
    __tablename__ = "fundraiser_payments"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    fundraiser_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fundraisers.id"),
        nullable=False,
    )

    child_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("children.id"),
        nullable=False,
    )

    payer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    transaction_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transactions.id"),
        unique=True,
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    paid_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    refund_transaction_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transactions.id"),
        unique=True,
        nullable=True,
    )

    fundraiser = relationship(
        "Fundraiser",
        back_populates="payments",
    )

    child = relationship(
        "Child",
        back_populates="fundraiser_payments",
    )

    payer = relationship(
        "User",
        back_populates="fundraiser_payments",
    )

    transaction = relationship(
        "Transaction",
        foreign_keys=[transaction_id],
        back_populates="fundraiser_payment",
    )

    refund_transaction = relationship(
        "Transaction",
        foreign_keys=[refund_transaction_id],
        back_populates="refund_for_payment",
    )


class TreasurerOperation(Base):
    __tablename__ = "treasurer_operations"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    fundraiser_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fundraisers.id"),
        nullable=False,
    )

    author_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    transaction_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transactions.id"),
        unique=True,
        nullable=False,
    )

    direction: Mapped[TreasurerOperationDirection] = mapped_column(
        SAEnum(
            TreasurerOperationDirection,
            name="treasurer_operation_direction",
        ),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    fundraiser = relationship(
        "Fundraiser",
        back_populates="treasurer_operations",
    )

    author = relationship(
        "User",
        back_populates="treasurer_operations",
    )

    transaction = relationship(
        "Transaction",
        back_populates="treasurer_operation",
    )


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    fundraiser_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fundraisers.id"),
        nullable=False,
    )

    added_by: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    amount: Mapped[Decimal | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    file_url: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    fundraiser = relationship(
        "Fundraiser",
        back_populates="invoices",
    )

    added_by_user = relationship(
        "User",
        back_populates="invoices_added",
    )
