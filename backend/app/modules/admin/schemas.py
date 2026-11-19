from decimal import Decimal
from uuid import UUID

from app.common.schemas import SchemaBase
from app.modules.children.schemas import ChildSummaryRead
from app.modules.classrooms.schemas import SchoolClassRead
from app.modules.fundraisers.schemas import FundraiserRead
from app.modules.reports.schemas import FinancialReport
from app.modules.users.schemas import UserRead, UserSummaryRead


class AdminUserRead(UserRead):
    """A row of the admin's Users / Treasurers table."""

    children: list[ChildSummaryRead]
    classes: list[SchoolClassRead]  # classes this user runs as treasurer


class AdminClassRead(SchemaBase):
    """The class a fundraiser belongs to, with its treasurer."""

    id: UUID
    name: str
    school_name: str | None
    treasurer: UserSummaryRead


class AdminFundraiserRead(FundraiserRead):
    """A row of the admin's Fundraisers table."""

    school_class: AdminClassRead
    children_count: int
    paid_count: int
    balance: Decimal


class AdminOverviewRead(SchemaBase):
    """System-wide metrics and financial report for the admin overview page."""

    parents_count: int
    treasurers_count: int
    classes_count: int
    active_fundraisers_count: int
    report: FinancialReport
