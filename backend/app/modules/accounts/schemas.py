import re
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from pydantic import StringConstraints, field_validator, model_validator

from app.common.schemas import NonNegativeMoney, PositiveMoney, SchemaBase
from app.modules.accounts.enums import AccountType, TransactionType

Iban = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=15, max_length=34),
]
AccountName = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]
Description = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]


def _normalize_iban(value: str) -> str:
    normalized = re.sub(r"\s+", "", value).upper()
    if not re.fullmatch(r"[A-Z]{2}[0-9A-Z]{13,32}", normalized):
        raise ValueError("invalid IBAN format")
    return normalized


def _reject_explicit_nulls(data: Any, fields: tuple[str, ...]) -> Any:
    if isinstance(data, dict):
        for field in fields:
            if field in data and data[field] is None:
                raise ValueError(f"{field} cannot be null")
    return data


class AccountRead(SchemaBase):
    id: UUID
    iban: str
    account_type: AccountType
    user_id: UUID | None
    fundraiser_id: UUID | None
    balance: NonNegativeMoney
    created_at: datetime


class AccountBalanceRead(SchemaBase):
    account_id: UUID
    balance: NonNegativeMoney


class TopUpCreate(SchemaBase):
    amount: PositiveMoney
    description: Description | None = None


class ExternalBankAccountCreate(SchemaBase):
    iban: Iban
    account_name: AccountName | None = None

    @field_validator("iban", mode="before")
    @classmethod
    def normalize_iban(cls, value: object) -> object:
        if isinstance(value, str):
            return _normalize_iban(value)
        return value


class ExternalBankAccountUpdate(SchemaBase):
    iban: Iban | None = None
    account_name: AccountName | None = None

    @model_validator(mode="before")
    @classmethod
    def iban_cannot_be_null(cls, data: Any) -> Any:
        return _reject_explicit_nulls(data, ("iban",))

    @field_validator("iban", mode="before")
    @classmethod
    def normalize_iban(cls, value: object) -> object:
        if isinstance(value, str):
            return _normalize_iban(value)
        return value


class ExternalBankAccountRead(SchemaBase):
    id: UUID
    user_id: UUID
    iban: str
    account_name: str | None
    created_at: datetime


class ExternalTransferCreate(SchemaBase):
    external_account_id: UUID
    amount: PositiveMoney
    description: Description | None = None


class TransactionRead(SchemaBase):
    id: UUID
    from_account_id: UUID | None
    to_account_id: UUID | None
    type: TransactionType
    amount: PositiveMoney
    created_by: UUID
    created_at: datetime
    description: str | None


class ExternalTransferRead(SchemaBase):
    id: UUID
    transaction_id: UUID
    external_account_id: UUID
    created_at: datetime


class ExternalTransferDetailRead(ExternalTransferRead):
    transaction: TransactionRead
    external_account: ExternalBankAccountRead
