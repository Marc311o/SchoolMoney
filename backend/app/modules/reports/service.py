from collections import defaultdict
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Select, func, literal, or_, select
from sqlalchemy.orm import Session, aliased, selectinload

from app.modules.accounts.models import Transaction
from app.modules.children.models import Child
from app.modules.classrooms.models import SchoolClass
from app.modules.classrooms.service import require_treasurer
from app.modules.fundraisers.enums import FundraiserStatus, TreasurerOperationDirection
from app.modules.fundraisers.models import (
    Fundraiser,
    FundraiserObligation,
    FundraiserPayment,
    TreasurerOperation,
)
from app.modules.fundraisers.service import _fundraisers_query
from app.modules.reports.schemas import (
    ZERO,
    AccountTotals,
    ContributionTotals,
    FinancialReport,
    ReportRow,
    ReportScope,
)
from app.modules.users.enums import UserRole
from app.modules.users.models import User


def _contribution_rows(
    db: Session, fundraiser_ids: list[UUID], child_id: UUID | None
) -> dict[UUID, list[ReportRow]]:
    refund = aliased(Transaction)
    obligations = (
        select(
            FundraiserObligation.fundraiser_id,
            FundraiserObligation.child_id,
            Fundraiser.required_amount_per_child.label("expected"),
            literal(ZERO).label("paid"),
            literal(ZERO).label("refunded"),
        )
        .join(FundraiserObligation.fundraiser)
        .where(FundraiserObligation.fundraiser_id.in_(fundraiser_ids))
    )
    payments = (
        select(
            FundraiserPayment.fundraiser_id,
            FundraiserPayment.child_id,
            literal(ZERO),
            Transaction.amount,
            func.coalesce(refund.amount, ZERO),
        )
        .join(FundraiserPayment.transaction)
        .outerjoin(FundraiserPayment.refund_transaction.of_type(refund))
        .where(FundraiserPayment.fundraiser_id.in_(fundraiser_ids))
    )
    if child_id is not None:
        obligations = obligations.where(FundraiserObligation.child_id == child_id)
        payments = payments.where(FundraiserPayment.child_id == child_id)

    entries = obligations.union_all(payments).subquery()
    statement = (
        select(
            entries.c.fundraiser_id,
            Child.id,
            Child.first_name,
            Child.last_name,
            func.sum(entries.c.expected),
            func.sum(entries.c.paid),
            func.sum(entries.c.refunded),
        )
        .join(Child, Child.id == entries.c.child_id)
        .group_by(entries.c.fundraiser_id, Child.id, Child.first_name, Child.last_name)
        .order_by(Child.last_name, Child.first_name, Child.id)
    )
    rows: dict[UUID, list[ReportRow]] = defaultdict(list)
    for fundraiser_id, id_, first, last, expected, paid, refunded in db.execute(statement):
        rows[fundraiser_id].append(
            ReportRow(
                id=id_,
                name=f"{first} {last}",
                contributions=ContributionTotals(
                    expected_total=expected, paid_total=paid, refunded_total=refunded
                ),
            )
        )
    return rows


def _sum_contributions(rows: list[ReportRow]) -> ContributionTotals:
    return ContributionTotals(
        expected_total=sum((row.contributions.expected_total for row in rows), ZERO),
        paid_total=sum((row.contributions.paid_total for row in rows), ZERO),
        refunded_total=sum((row.contributions.refunded_total for row in rows), ZERO),
    )


def _account_totals(db: Session, fundraisers: list[Fundraiser]) -> dict[UUID, AccountTotals]:
    statement = (
        select(
            TreasurerOperation.fundraiser_id,
            TreasurerOperation.direction,
            func.sum(Transaction.amount),
        )
        .join(TreasurerOperation.transaction)
        .where(TreasurerOperation.fundraiser_id.in_([fundraiser.id for fundraiser in fundraisers]))
        .group_by(TreasurerOperation.fundraiser_id, TreasurerOperation.direction)
    )
    operations = {(id_, direction): amount for id_, direction, amount in db.execute(statement)}
    return {
        fundraiser.id: AccountTotals(
            current_balance=fundraiser.account.balance if fundraiser.account is not None else ZERO,
            treasurer_deposited_total=operations.get(
                (fundraiser.id, TreasurerOperationDirection.DEPOSIT), ZERO
            ),
            treasurer_withdrawn_total=operations.get(
                (fundraiser.id, TreasurerOperationDirection.WITHDRAWAL), ZERO
            ),
        )
        for fundraiser in fundraisers
    }


def _load_fundraisers(db: Session, statement: Select[tuple[Fundraiser]]) -> list[Fundraiser]:
    return list(
        db.scalars(statement.order_by(Fundraiser.id).with_for_update(of=Fundraiser, read=True))
    )


def get_report(db: Session, user: User, scope: ReportScope, subject_id: UUID) -> FinancialReport:
    is_admin = user.role == UserRole.ADMIN
    statement = select(Fundraiser)
    child_id = None
    if scope == "fundraiser":
        if not is_admin:
            statement = _fundraisers_query(user)
        statement = statement.where(Fundraiser.id == subject_id)
    elif scope == "class":
        school_class = (
            db.get(SchoolClass, subject_id) if is_admin else require_treasurer(db, user, subject_id)
        )
        if school_class is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Class not found")
        name = school_class.name
        statement = statement.where(Fundraiser.class_id == subject_id)
    else:
        child_statement = select(Child).where(Child.id == subject_id)
        if not is_admin:
            child_statement = child_statement.where(Child.parent_id == user.id)
        child = db.scalar(child_statement)
        if child is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Child not found")
        name = f"{child.first_name} {child.last_name}"
        child_id = child.id
        statement = statement.where(
            or_(
                Fundraiser.obligations.any(FundraiserObligation.child_id == child.id),
                Fundraiser.payments.any(FundraiserPayment.child_id == child.id),
            )
        )

    if scope != "fundraiser":
        statement = statement.where(Fundraiser.status != FundraiserStatus.DRAFT)
    if scope != "child":
        statement = statement.options(selectinload(Fundraiser.account))

    fundraisers = _load_fundraisers(db, statement)
    if scope == "fundraiser" and not fundraisers:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fundraiser not found")

    groups = _contribution_rows(db, [fundraiser.id for fundraiser in fundraisers], child_id)
    accounts = _account_totals(db, fundraisers) if scope != "child" else {}
    if scope == "fundraiser":
        name = fundraisers[0].name
        rows = groups[subject_id]
        account = accounts[subject_id]
    else:
        rows = [
            ReportRow(
                id=fundraiser.id,
                name=fundraiser.name,
                contributions=_sum_contributions(groups[fundraiser.id]),
                account=accounts.get(fundraiser.id),
            )
            for fundraiser in sorted(fundraisers, key=lambda f: (f.start_date, f.id))
        ]
        account = None
        if scope == "class":
            account = AccountTotals(
                current_balance=sum((item.current_balance for item in accounts.values()), ZERO),
                treasurer_deposited_total=sum(
                    (item.treasurer_deposited_total for item in accounts.values()), ZERO
                ),
                treasurer_withdrawn_total=sum(
                    (item.treasurer_withdrawn_total for item in accounts.values()), ZERO
                ),
            )

    return FinancialReport(
        scope=scope,
        id=subject_id,
        name=name,
        contributions=_sum_contributions(rows),
        account=account,
        rows=rows,
    )
