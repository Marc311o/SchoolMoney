"""Build test data straight in the database, skipping the API.

Use these for setup the endpoint under test does not cover (a fundraiser with a
payment, a class membership). Each function flushes, so ids are ready to use.
"""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.accounts.enums import TransactionType
from app.modules.accounts.models import Account, Transaction
from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.fundraisers.enums import FundraiserStatus
from app.modules.fundraisers.models import Fundraiser, FundraiserObligation, FundraiserPayment


def make_class(db: Session, treasurer_id: UUID, name: str = "1A") -> SchoolClass:
    school_class = SchoolClass(id=uuid4(), name=name, treasurer_id=treasurer_id)
    db.add(school_class)
    db.flush()
    return school_class


def make_membership(
    db: Session,
    child_id: UUID,
    class_id: UUID,
    status: MembershipStatus = MembershipStatus.ACTIVE,
) -> ChildClassMembership:
    membership = ChildClassMembership(
        id=uuid4(), child_id=child_id, class_id=class_id, status=status
    )
    db.add(membership)
    db.flush()
    return membership


def make_fundraiser(
    db: Session,
    school_class: SchoolClass,
    status: FundraiserStatus = FundraiserStatus.ACTIVE,
    name: str | None = None,
    amount: Decimal = Decimal("50.00"),
) -> Fundraiser:
    fundraiser = Fundraiser(
        id=uuid4(),
        class_id=school_class.id,
        author_id=school_class.treasurer_id,
        name=name or f"Trip ({status})",
        required_amount=amount,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=30),
        status=status,
    )
    db.add(fundraiser)
    db.flush()
    return fundraiser


def make_obligation(db: Session, fundraiser: Fundraiser, child_id: UUID) -> FundraiserObligation:
    obligation = FundraiserObligation(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        child_id=child_id,
        required_amount_per_child=fundraiser.required_amount,
    )
    db.add(obligation)
    db.flush()
    return obligation


def make_payment(
    db: Session, fundraiser: Fundraiser, child_id: UUID, refunded: bool = False
) -> FundraiserPayment:
    """A payment by the child's parent. Balances are not touched; only the rows exist."""
    child = db.get(Child, child_id)
    parent_account = db.scalars(select(Account).where(Account.user_id == child.parent_id)).one()
    transaction = Transaction(
        id=uuid4(),
        from_account_id=parent_account.id,
        type=TransactionType.FUNDRAISER_PAYMENT,
        amount=fundraiser.required_amount,
        created_by=child.parent_id,
    )
    db.add(transaction)
    db.flush()
    payment = FundraiserPayment(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        child_id=child.id,
        payer_id=child.parent_id,
        transaction_id=transaction.id,
        amount=fundraiser.required_amount,
        refunded_at=datetime.now(UTC) if refunded else None,
    )
    db.add(payment)
    db.flush()
    return payment
