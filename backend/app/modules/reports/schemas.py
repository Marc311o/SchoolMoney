from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import computed_field

from app.common.schemas import SchemaBase
from app.modules.fundraisers.schemas import MoneyTotal

ReportScope = Literal["fundraiser", "child", "class"]
ReportLanguage = Literal["pl", "en"]
ZERO = Decimal("0.00")


class ContributionTotals(SchemaBase):
    expected_total: MoneyTotal
    paid_total: MoneyTotal
    refunded_total: MoneyTotal

    @computed_field
    @property
    def net_paid_total(self) -> Decimal:
        return self.paid_total - self.refunded_total


class AccountTotals(SchemaBase):
    current_balance: MoneyTotal
    treasurer_deposited_total: MoneyTotal
    treasurer_withdrawn_total: MoneyTotal


class ReportRow(SchemaBase):
    id: UUID
    name: str
    contributions: ContributionTotals
    account: AccountTotals | None = None


class FinancialReport(ReportRow):
    scope: ReportScope
    currency: Literal["PLN"] = "PLN"
    rows: list[ReportRow]
