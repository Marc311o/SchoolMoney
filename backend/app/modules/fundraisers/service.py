from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import Select, delete, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.accounts.enums import AccountType, TransactionType
from app.modules.accounts.models import Account, Transaction
from app.modules.accounts.service import get_wallet, move_money
from app.modules.accounts.utils import generate_fake_iban
from app.modules.children.models import Child
from app.modules.children.service import active_children_query
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.classrooms.service import active_class_children_query, require_treasurer
from app.modules.fundraisers.enums import FundraiserStatus, TreasurerOperationDirection
from app.modules.fundraisers.models import (
    Fundraiser,
    FundraiserObligation,
    FundraiserPayment,
    Invoice,
    TreasurerOperation,
)
from app.modules.fundraisers.schemas import (
    ChildFundraiserProgressRead,
    FundraiserCloseResult,
    FundraiserCreate,
    FundraiserDetailRead,
    FundraiserPaymentCreate,
    FundraiserPaymentRead,
    FundraiserProgressRead,
    FundraiserRead,
    FundraiserUpdate,
    InvoiceCreate,
    InvoiceRead,
    TreasurerDepositCreate,
    TreasurerOperationRead,
    TreasurerWithdrawalCreate,
)
from app.modules.users.models import User

ZERO = Decimal("0.00")
MAX_ACCOUNT_BALANCE = Decimal("9999999999.99")
SCHOOL_TIMEZONE = ZoneInfo("Europe/Warsaw")


def _fundraisers_query(user: User, *, treasurer_only: bool = False) -> Select[tuple[Fundraiser]]:
    statement = select(Fundraiser).join(Fundraiser.school_class)
    is_treasurer = SchoolClass.treasurer_id == user.id
    if treasurer_only:
        return statement.where(is_treasurer)

    is_class_parent = (
        active_class_children_query()
        .where(ChildClassMembership.class_id == Fundraiser.class_id, Child.parent_id == user.id)
        .exists()
    )
    return statement.where(
        is_treasurer | (is_class_parent & (Fundraiser.status != FundraiserStatus.DRAFT))
    )


def _get_fundraiser(
    db: Session,
    user: User,
    fundraiser_id: UUID,
    *,
    treasurer_only: bool = False,
    lock: Literal["share", "update"] | None = None,
) -> Fundraiser:
    statement = _fundraisers_query(user, treasurer_only=treasurer_only).where(
        Fundraiser.id == fundraiser_id
    )
    if lock is not None:
        statement = statement.with_for_update(
            of=Fundraiser, read=lock == "share"
        ).execution_options(populate_existing=True)
    fundraiser = db.scalar(statement)
    if fundraiser is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fundraiser not found")
    return fundraiser


def _require_editable(fundraiser: Fundraiser) -> None:
    if fundraiser.is_blocked or fundraiser.status == FundraiserStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser is closed or blocked",
        )


def _lock_account(db: Session, fundraiser_id: UUID) -> Account | None:
    return db.scalar(
        select(Account)
        .where(Account.fundraiser_id == fundraiser_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )


def list_fundraisers(db: Session, user: User, class_id: UUID | None = None) -> list[FundraiserRead]:
    statement = _fundraisers_query(user).options(joinedload(Fundraiser.account))
    if class_id is not None:
        statement = statement.where(Fundraiser.class_id == class_id)
    rows = db.scalars(statement.order_by(Fundraiser.created_at.desc(), Fundraiser.id))
    return [FundraiserRead.model_validate(fundraiser) for fundraiser in rows]


def get_fundraiser(db: Session, user: User, fundraiser_id: UUID) -> FundraiserDetailRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, lock="share")
    child_ids = db.scalars(
        select(FundraiserObligation.child_id)
        .where(FundraiserObligation.fundraiser_id == fundraiser.id)
        .order_by(FundraiserObligation.child_id)
    ).all()
    payments = db.scalars(
        select(FundraiserPayment)
        .where(FundraiserPayment.fundraiser_id == fundraiser.id)
        .options(
            joinedload(FundraiserPayment.transaction),
            joinedload(FundraiserPayment.refund_transaction),
        )
    )
    paid_by_child: dict[UUID, Decimal] = defaultdict(lambda: ZERO)
    refunded_by_child: dict[UUID, Decimal] = defaultdict(lambda: ZERO)
    for payment in payments:
        if payment.refunded_at is None:
            paid_by_child[payment.child_id] += payment.transaction.amount
        else:
            # Older full-refund rows can lack a linked refund transaction.
            refund = payment.refund_transaction or payment.transaction
            refunded_by_child[payment.child_id] += refund.amount

    rate = fundraiser.required_amount_per_child
    children = []
    for child_id in child_ids:
        paid = paid_by_child[child_id]
        remaining = max(rate - paid, ZERO)
        children.append(
            ChildFundraiserProgressRead(
                child_id=child_id,
                required_amount_per_child=rate,
                paid_amount=paid,
                refunded_amount=refunded_by_child[child_id],
                remaining_amount=remaining,
                is_paid=remaining == ZERO,
            )
        )

    operations = dict(
        db.execute(
            select(TreasurerOperation.direction, func.sum(TreasurerOperation.amount))
            .where(TreasurerOperation.fundraiser_id == fundraiser.id)
            .group_by(TreasurerOperation.direction)
        ).all()
    )
    progress = FundraiserProgressRead(
        fundraiser_id=fundraiser.id,
        children_count=len(child_ids),
        required_total=rate * len(child_ids),
        paid_total=sum(paid_by_child.values(), ZERO),
        refunded_total=sum(refunded_by_child.values(), ZERO),
        treasurer_withdrawn_total=operations.get(TreasurerOperationDirection.WITHDRAWAL, ZERO),
        treasurer_deposited_total=operations.get(TreasurerOperationDirection.DEPOSIT, ZERO),
        current_balance=fundraiser.account.balance if fundraiser.account is not None else ZERO,
    )
    return FundraiserDetailRead(
        **FundraiserRead.model_validate(fundraiser).model_dump(),
        children=children,
        progress=progress,
    )


def list_payments(db: Session, user: User, fundraiser_id: UUID) -> list[FundraiserPaymentRead]:
    fundraiser = _get_fundraiser(db, user, fundraiser_id)
    payments = db.scalars(
        select(FundraiserPayment)
        .where(FundraiserPayment.fundraiser_id == fundraiser.id)
        .options(joinedload(FundraiserPayment.transaction))
        .order_by(FundraiserPayment.paid_at.desc(), FundraiserPayment.id.desc())
    )
    return [FundraiserPaymentRead.model_validate(payment) for payment in payments]


def pay_for_child(
    db: Session, user: User, fundraiser_id: UUID, data: FundraiserPaymentCreate
) -> FundraiserPaymentRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, lock="update")
    today = datetime.now(SCHOOL_TIMEZONE).date()

    if fundraiser.is_blocked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser is blocked",
        )

    if fundraiser.status != FundraiserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser is not accepting payments",
        )

    if today < fundraiser.start_date:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser has not started yet",
        )

    if fundraiser.end_date is not None and today > fundraiser.end_date:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser has already ended",
        )

    # Child removal takes the same lock before checking payments and deleting obligations.
    child_id = db.scalar(
        active_children_query()
        .with_only_columns(Child.id)
        .where(Child.id == data.child_id)
        .with_for_update(of=Child)
    )
    obligation = select(FundraiserObligation.id).where(
        FundraiserObligation.fundraiser_id == fundraiser.id,
        FundraiserObligation.child_id == data.child_id,
    )
    if child_id is None or db.scalar(obligation) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    paid = select(FundraiserPayment.id).where(
        FundraiserPayment.fundraiser_id == fundraiser.id,
        FundraiserPayment.child_id == child_id,
        FundraiserPayment.refunded_at.is_(None),
    )
    if db.scalar(paid.limit(1)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Child is already paid")

    amount = fundraiser.required_amount_per_child
    wallet = get_wallet(db, user, lock=True)
    if wallet.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough money in your wallet",
        )

    account = _lock_account(db, fundraiser.id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Fundraiser has no account"
        )
    if account.balance + amount > MAX_ACCOUNT_BALANCE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser account balance would exceed its limit",
        )

    transaction = move_money(
        db,
        amount=amount,
        type_=TransactionType.FUNDRAISER_PAYMENT,
        created_by=user,
        from_account=wallet,
        to_account=account,
        description=f"Fundraiser payment – {fundraiser.name}",
    )
    payment = FundraiserPayment(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        child_id=child_id,
        payer_id=user.id,
        transaction=transaction,
    )
    db.add(payment)
    db.flush()
    result = FundraiserPaymentRead.model_validate(payment)
    db.commit()
    return result


def create_fundraiser(db: Session, user: User, data: FundraiserCreate) -> FundraiserRead:
    require_treasurer(db, user, data.class_id)
    child_ids = db.scalars(
        active_class_children_query()
        .with_only_columns(Child.id)
        .where(ChildClassMembership.class_id == data.class_id)
        .order_by(Child.id)
        .with_for_update(of=Child)
    ).all()
    fundraiser = Fundraiser(
        id=uuid4(),
        author_id=user.id,
        status=FundraiserStatus.ACTIVE,
        **data.model_dump(),
    )
    fundraiser.account = Account(
        id=uuid4(), iban=generate_fake_iban(), account_type=AccountType.FUNDRAISER
    )
    fundraiser.obligations = [
        FundraiserObligation(id=uuid4(), child_id=child_id) for child_id in child_ids
    ]
    db.add(fundraiser)
    db.flush()
    result = FundraiserRead.model_validate(fundraiser)
    db.commit()
    return result


def update_fundraiser(
    db: Session, user: User, fundraiser_id: UUID, data: FundraiserUpdate
) -> FundraiserRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, treasurer_only=True, lock="update")
    _require_editable(fundraiser)
    start = data.start_date or fundraiser.start_date
    end = data.end_date or fundraiser.end_date
    if end < start:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="end_date must be greater than or equal to start_date",
        )

    rate = data.required_amount_per_child
    if rate is not None and rate != fundraiser.required_amount_per_child:
        payment = select(FundraiserPayment.id).where(
            FundraiserPayment.fundraiser_id == fundraiser.id
        )
        if db.scalar(payment.limit(1)) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The contribution cannot change after a payment has been recorded",
            )

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(fundraiser, field, value)
    db.flush()
    result = FundraiserRead.model_validate(fundraiser)
    db.commit()
    return result


def delete_fundraiser(db: Session, user: User, fundraiser_id: UUID) -> None:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, treasurer_only=True, lock="update")
    _require_editable(fundraiser)
    account = _lock_account(db, fundraiser.id)
    activity = select(Fundraiser.id).where(
        Fundraiser.id == fundraiser.id,
        or_(
            Fundraiser.payments.any(),
            Fundraiser.treasurer_operations.any(),
            Fundraiser.invoices.any(),
        ),
    )
    has_activity = db.scalar(activity) is not None
    if account is not None and not has_activity:
        transaction = select(Transaction.id).where(
            or_(Transaction.from_account_id == account.id, Transaction.to_account_id == account.id)
        )
        has_activity = account.balance != 0 or db.scalar(transaction.limit(1)) is not None
    if has_activity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraisers with financial history cannot be deleted",
        )

    db.execute(
        delete(FundraiserObligation).where(FundraiserObligation.fundraiser_id == fundraiser.id)
    )
    if account is not None:
        db.execute(delete(Account).where(Account.id == account.id))
    db.execute(delete(Fundraiser).where(Fundraiser.id == fundraiser.id))
    db.commit()


def create_withdrawal(
    db: Session,
    user: User,
    fundraiser_id: UUID,
    data: TreasurerWithdrawalCreate,
) -> TreasurerOperationRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, treasurer_only=True, lock="update")
    _require_editable(fundraiser)

    account = _lock_account(db, fundraiser.id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser has no account",
        )
    if account.balance < data.amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough balance on the fundraiser account",
        )

    treasurer_wallet = get_wallet(db, user, lock=True)
    transaction = move_money(
        db,
        amount=data.amount,
        type_=TransactionType.TREASURER_WITHDRAWAL,
        created_by=user,
        from_account=account,
        to_account=treasurer_wallet,
        description=data.description or f"Advance – {fundraiser.name}",
    )
    operation = TreasurerOperation(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        author_id=user.id,
        transaction_id=transaction.id,
        direction=TreasurerOperationDirection.WITHDRAWAL,
        amount=data.amount,
        description=data.description,
    )
    db.add(operation)
    db.flush()
    result = TreasurerOperationRead.model_validate(operation)
    db.commit()
    return result


def create_deposit(
    db: Session,
    user: User,
    fundraiser_id: UUID,
    data: TreasurerDepositCreate,
) -> TreasurerOperationRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, treasurer_only=True, lock="update")
    _require_editable(fundraiser)

    treasurer_wallet = get_wallet(db, user, lock=True)
    if treasurer_wallet.balance < data.amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough money in your wallet",
        )

    account = _lock_account(db, fundraiser.id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser has no account",
        )
    if account.balance + data.amount > MAX_ACCOUNT_BALANCE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser account balance would exceed its limit",
        )

    transaction = move_money(
        db,
        amount=data.amount,
        type_=TransactionType.TREASURER_DEPOSIT,
        created_by=user,
        from_account=treasurer_wallet,
        to_account=account,
        description=data.description or f"Deposit – {fundraiser.name}",
    )
    operation = TreasurerOperation(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        author_id=user.id,
        transaction_id=transaction.id,
        direction=TreasurerOperationDirection.DEPOSIT,
        amount=data.amount,
        description=data.description,
    )
    db.add(operation)
    db.flush()
    result = TreasurerOperationRead.model_validate(operation)
    db.commit()
    return result


def refund_payment(
    db: Session,
    user: User,
    fundraiser_id: UUID,
    payment_id: UUID,
) -> FundraiserPaymentRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, lock="update")
    if fundraiser.is_blocked or fundraiser.status != FundraiserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser is not accepting refund requests",
        )

    payment = db.scalar(
        select(FundraiserPayment)
        .where(
            FundraiserPayment.id == payment_id,
            FundraiserPayment.fundraiser_id == fundraiser.id,
        )
        .with_for_update(of=FundraiserPayment)
        .options(joinedload(FundraiserPayment.transaction))
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.refunded_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already refunded")

    is_treasurer = fundraiser.school_class.treasurer_id == user.id
    if payment.payer_id != user.id and not is_treasurer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")

    amount = payment.transaction.amount
    account = _lock_account(db, fundraiser.id)
    if account is None or account.balance < amount:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough balance on the fundraiser account",
        )

    payer_wallet = db.scalar(
        select(Account).where(Account.user_id == payment.payer_id).with_for_update()
    )
    if payer_wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payer wallet not found")

    refund_tx = move_money(
        db,
        amount=amount,
        type_=TransactionType.PAYMENT_REFUND,
        created_by=user,
        from_account=account,
        to_account=payer_wallet,
        description=f"Refund – {fundraiser.name}",
    )
    payment.refunded_at = datetime.now(UTC)
    payment.refund_transaction = refund_tx
    db.flush()
    result = FundraiserPaymentRead.model_validate(payment)
    db.commit()
    return result


def close_fundraiser(
    db: Session,
    user: User,
    fundraiser_id: UUID,
) -> FundraiserCloseResult:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, treasurer_only=True, lock="update")
    if fundraiser.status == FundraiserStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser is already closed",
        )

    account = _lock_account(db, fundraiser.id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fundraiser has no account",
        )

    unrefunded_payments = list(
        db.scalars(
            select(FundraiserPayment)
            .where(
                FundraiserPayment.fundraiser_id == fundraiser.id,
                FundraiserPayment.refunded_at.is_(None),
            )
            .with_for_update(of=FundraiserPayment)
            .options(joinedload(FundraiserPayment.transaction))
        )
    )

    refunded_total = ZERO
    refund_count = 0
    now_utc = datetime.now(UTC)

    if account.balance > ZERO and unrefunded_payments:
        initial_fundraiser_balance = account.balance
        total_paid = sum(p.transaction.amount for p in unrefunded_payments)
        remaining_balance = account.balance

        for idx, payment in enumerate(unrefunded_payments):
            if remaining_balance <= ZERO:
                break

            if idx == len(unrefunded_payments) - 1:
                refund_amount = min(payment.transaction.amount, remaining_balance)
            else:
                proportional = (
                    payment.transaction.amount / total_paid * initial_fundraiser_balance
                ).quantize(Decimal("0.01"))
                refund_amount = min(payment.transaction.amount, proportional, remaining_balance)

            if refund_amount <= ZERO:
                continue

            payer_wallet = db.scalar(
                select(Account).where(Account.user_id == payment.payer_id).with_for_update()
            )
            refund_tx = move_money(
                db,
                amount=refund_amount,
                type_=TransactionType.CLOSE_REFUND,
                created_by=user,
                from_account=account,
                to_account=payer_wallet,
                description=f"Close refund – {fundraiser.name}",
            )
            payment.refunded_at = now_utc
            payment.refund_transaction = refund_tx
            refunded_total += refund_amount
            refund_count += 1
            remaining_balance -= refund_amount

    fundraiser.status = FundraiserStatus.CLOSED
    fundraiser.closed_at = now_utc
    db.flush()
    result = FundraiserCloseResult(
        fundraiser_id=fundraiser.id,
        status=FundraiserStatus.CLOSED,
        closed_at=now_utc,
        refunded_total=refunded_total,
        refund_transactions=refund_count,
    )
    db.commit()
    return result


def list_invoices(
    db: Session,
    user: User,
    fundraiser_id: UUID,
) -> list[InvoiceRead]:
    fundraiser = _get_fundraiser(db, user, fundraiser_id)
    invoices = db.scalars(
        select(Invoice)
        .where(Invoice.fundraiser_id == fundraiser.id)
        .order_by(Invoice.created_at.desc(), Invoice.id.desc())
    )
    return [InvoiceRead.model_validate(inv) for inv in invoices]


def create_invoice(
    db: Session,
    user: User,
    fundraiser_id: UUID,
    data: InvoiceCreate,
) -> InvoiceRead:
    fundraiser = _get_fundraiser(db, user, fundraiser_id, treasurer_only=True, lock="update")
    _require_editable(fundraiser)

    invoice = Invoice(
        id=uuid4(),
        fundraiser_id=fundraiser.id,
        added_by=user.id,
        title=data.title,
        amount=data.amount,
        file_url=data.file_url,
    )
    db.add(invoice)
    db.flush()
    result = InvoiceRead.model_validate(invoice)
    db.commit()
    return result
