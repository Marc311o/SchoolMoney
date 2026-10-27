from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Uuid,
    func,
    text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.accounts.enums import AccountType, TransactionType


class Account(Base):
    __tablename__ = "accounts"

    __table_args__ = (
        CheckConstraint(
            "balance >= 0",
            name="account_balance_not_negative",
        ),
        CheckConstraint(
            "(account_type = 'USER' AND user_id IS NOT NULL AND fundraiser_id IS NULL) "
            "OR "
            "(account_type = 'FUNDRAISER' AND fundraiser_id IS NOT NULL AND user_id IS NULL)",
            name="account_owner_matches_type",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    iban: Mapped[str] = mapped_column(
        String(34),
        unique=True,
        nullable=False,
    )

    account_type: Mapped[AccountType] = mapped_column(
        SAEnum(
            AccountType,
            name="account_type",
        ),
        nullable=False,
    )

    user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        unique=True,
        nullable=True,
    )

    fundraiser_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fundraisers.id"),
        unique=True,
        nullable=True,
    )

    balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        server_default=text("0"),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user = relationship(
        "User",
        back_populates="account",
    )

    fundraiser = relationship(
        "Fundraiser",
        back_populates="account",
    )

    outgoing_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.from_account_id",
        back_populates="from_account",
    )

    incoming_transactions = relationship(
        "Transaction",
        foreign_keys="Transaction.to_account_id",
        back_populates="to_account",
    )


class Transaction(Base):
    __tablename__ = "transactions"

    __table_args__ = (
        CheckConstraint(
            "amount > 0",
            name="transaction_amount_positive",
        ),
        CheckConstraint(
            "from_account_id IS NOT NULL OR to_account_id IS NOT NULL",
            name="transaction_has_account",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    from_account_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id"),
        nullable=True,
    )

    to_account_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("accounts.id"),
        nullable=True,
    )

    type: Mapped[TransactionType] = mapped_column(
        SAEnum(
            TransactionType,
            name="transaction_type",
        ),
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
    )

    created_by: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    description: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    from_account = relationship(
        "Account",
        foreign_keys=[from_account_id],
        back_populates="outgoing_transactions",
    )

    to_account = relationship(
        "Account",
        foreign_keys=[to_account_id],
        back_populates="incoming_transactions",
    )

    creator = relationship(
        "User",
        back_populates="transactions_created",
    )

    external_transfer = relationship(
        "ExternalTransfer",
        back_populates="transaction",
        uselist=False,
    )

    fundraiser_payment = relationship(
        "FundraiserPayment",
        foreign_keys="FundraiserPayment.transaction_id",
        back_populates="transaction",
        uselist=False,
    )

    refund_for_payment = relationship(
        "FundraiserPayment",
        foreign_keys="FundraiserPayment.refund_transaction_id",
        back_populates="refund_transaction",
        uselist=False,
    )

    treasurer_operation = relationship(
        "TreasurerOperation",
        back_populates="transaction",
        uselist=False,
    )


class ExternalBankAccount(Base):
    __tablename__ = "external_bank_accounts"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    iban: Mapped[str] = mapped_column(
        String(34),
        nullable=False,
    )

    account_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user = relationship(
        "User",
        back_populates="external_bank_accounts",
    )

    transfers = relationship(
        "ExternalTransfer",
        back_populates="external_account",
    )


class ExternalTransfer(Base):
    __tablename__ = "external_transfers"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    transaction_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("transactions.id"),
        unique=True,
        nullable=False,
    )

    external_account_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("external_bank_accounts.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    transaction = relationship(
        "Transaction",
        back_populates="external_transfer",
    )

    external_account = relationship(
        "ExternalBankAccount",
        back_populates="transfers",
    )
