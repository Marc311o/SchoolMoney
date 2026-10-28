from datetime import date, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import Field, StringConstraints, model_validator

from app.common.schemas import NonNegativeMoney, PositiveMoney, SchemaBase
from app.modules.fundraisers.enums import FundraiserStatus, TreasurerOperationDirection

FundraiserName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
TextDescription = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]
ShortDescription = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]
ResourceUrl = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]
InvoiceTitle = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]


def _reject_explicit_nulls(data: Any, fields: tuple[str, ...]) -> Any:
    if isinstance(data, dict):
        for field in fields:
            if field in data and data[field] is None:
                raise ValueError(f"{field} cannot be null")
    return data


def _validate_date_order(start_date: date | None, end_date: date | None) -> None:
    if start_date is not None and end_date is not None and end_date < start_date:
        raise ValueError("end_date must be greater than or equal to start_date")


class FundraiserCreate(SchemaBase):
    class_id: UUID
    name: FundraiserName
    description: TextDescription | None = None
    logo_url: ResourceUrl | None = None
    required_amount: PositiveMoney
    start_date: date
    end_date: date

    @model_validator(mode="after")
    def dates_are_valid(self) -> "FundraiserCreate":
        _validate_date_order(self.start_date, self.end_date)
        return self


class FundraiserUpdate(SchemaBase):
    name: FundraiserName | None = None
    description: TextDescription | None = None
    logo_url: ResourceUrl | None = None
    required_amount: PositiveMoney | None = None
    start_date: date | None = None
    end_date: date | None = None

    @model_validator(mode="before")
    @classmethod
    def non_nullable_database_fields(cls, data: Any) -> Any:
        return _reject_explicit_nulls(
            data,
            ("name", "required_amount", "start_date", "end_date"),
        )

    @model_validator(mode="after")
    def dates_are_valid(self) -> "FundraiserUpdate":
        _validate_date_order(self.start_date, self.end_date)
        return self


class FundraiserBlockUpdate(SchemaBase):
    is_blocked: bool


class FundraiserRead(SchemaBase):
    id: UUID
    class_id: UUID
    author_id: UUID
    name: str
    description: str | None
    logo_url: str | None
    required_amount: PositiveMoney
    start_date: date
    end_date: date
    status: FundraiserStatus
    is_blocked: bool
    created_at: datetime
    closed_at: datetime | None


class FundraiserObligationRead(SchemaBase):
    id: UUID
    fundraiser_id: UUID
    child_id: UUID
    required_amount_per_child: PositiveMoney
    created_at: datetime


class FundraiserPaymentCreate(SchemaBase):
    child_id: UUID
    amount: PositiveMoney


class FundraiserPaymentRead(SchemaBase):
    id: UUID
    fundraiser_id: UUID
    child_id: UUID
    payer_id: UUID
    transaction_id: UUID
    amount: PositiveMoney
    paid_at: datetime
    refunded_at: datetime | None
    refund_transaction_id: UUID | None


class FundraiserPaymentRefundRequest(SchemaBase):
    reason: ShortDescription | None = None


class TreasurerWithdrawalCreate(SchemaBase):
    amount: PositiveMoney
    description: ShortDescription | None = None


class TreasurerDepositCreate(SchemaBase):
    amount: PositiveMoney
    description: ShortDescription | None = None


class TreasurerOperationRead(SchemaBase):
    id: UUID
    fundraiser_id: UUID
    author_id: UUID
    transaction_id: UUID
    direction: TreasurerOperationDirection
    amount: PositiveMoney
    description: str | None
    created_at: datetime


class InvoiceCreate(SchemaBase):
    title: InvoiceTitle
    amount: PositiveMoney | None = None
    file_url: ResourceUrl


class InvoiceRead(SchemaBase):
    id: UUID
    fundraiser_id: UUID
    added_by: UUID
    title: str
    amount: PositiveMoney | None
    file_url: str
    created_at: datetime


class ChildFundraiserProgressRead(SchemaBase):
    child_id: UUID
    required_amount: PositiveMoney
    paid_amount: NonNegativeMoney
    refunded_amount: NonNegativeMoney
    remaining_amount: NonNegativeMoney
    is_paid: bool


class FundraiserProgressRead(SchemaBase):
    fundraiser_id: UUID
    children_count: int = Field(ge=0)
    required_total: NonNegativeMoney
    paid_total: NonNegativeMoney
    refunded_total: NonNegativeMoney
    treasurer_withdrawn_total: NonNegativeMoney
    treasurer_deposited_total: NonNegativeMoney
    current_balance: NonNegativeMoney


class FundraiserCloseResult(SchemaBase):
    fundraiser_id: UUID
    status: Literal[FundraiserStatus.CLOSED]
    closed_at: datetime
    refunded_total: NonNegativeMoney
    refund_transactions: int = Field(ge=0)
