import math
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.modules.accounts.enums import AccountType, TransactionType
from app.modules.accounts.models import (
    Account,
    ExternalBankAccount,
    ExternalTransfer,
    Transaction,
)
from app.modules.accounts.schemas import (
    ExternalBankAccountCreate,
    ExternalTransferCreate,
    PaginatedTransactionsRead,
    TopUpCreate,
)
from app.modules.users.models import User


class InsufficientFundsError(Exception):
    pass


# ---------------------------------------------------------------------------
# Ledger
# ---------------------------------------------------------------------------


def move_money(
    db: Session,
    *,
    amount: Decimal,
    type_: TransactionType,
    created_by: User,
    from_account: Account | None = None,
    to_account: Account | None = None,
    description: str | None = None,
) -> Transaction:
    """The only place that changes balances.
    Lock the accounts first and commit afterwards;
    """
    if from_account is not None:
        if from_account.balance < amount:
            raise InsufficientFundsError
        from_account.balance -= amount
    if to_account is not None:
        to_account.balance += amount

    transaction = Transaction(
        id=uuid4(),
        from_account_id=from_account.id if from_account else None,
        to_account_id=to_account.id if to_account else None,
        type=type_,
        amount=amount,
        created_by=created_by.id,
        description=description,
    )
    db.add(transaction)
    db.flush()
    return transaction


# ---------------------------------------------------------------------------
# Wallet
# ---------------------------------------------------------------------------


def get_wallet(db: Session, user: User, *, lock: bool = False) -> Account:
    """The user's own SchoolMoney account. `lock` holds the row until commit."""
    statement = select(Account).where(
        Account.user_id == user.id,
        Account.account_type == AccountType.USER,
    )
    if lock:
        statement = statement.with_for_update().execution_options(populate_existing=True)

    wallet = db.scalar(statement)
    if wallet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wallet not found")
    return wallet


def top_up(db: Session, user: User, data: TopUpCreate) -> Account:
    wallet = get_wallet(db, user, lock=True)
    move_money(
        db,
        amount=data.amount,
        type_=TransactionType.TOP_UP,
        created_by=user,
        to_account=wallet,
        description=data.description or "Top-up",
    )
    db.commit()
    db.refresh(wallet)
    return wallet


# ---------------------------------------------------------------------------
# External bank accounts
# ---------------------------------------------------------------------------


def list_external_accounts(db: Session, user: User) -> list[ExternalBankAccount]:
    return list(
        db.scalars(
            select(ExternalBankAccount)
            .where(ExternalBankAccount.user_id == user.id)
            .order_by(ExternalBankAccount.created_at)
        )
    )


def add_external_account(
    db: Session, user: User, data: ExternalBankAccountCreate
) -> ExternalBankAccount:

    # Checks if the account is internal
    if db.scalar(select(Account.id).where(Account.iban == data.iban)) is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="This is a SchoolMoney account number. Use your real bank account.",
        )

    duplicate = db.scalar(
        select(ExternalBankAccount.id).where(
            ExternalBankAccount.user_id == user.id,
            ExternalBankAccount.iban == data.iban,
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already added this bank account",
        )

    account = ExternalBankAccount(
        id=uuid4(),
        user_id=user.id,
        iban=data.iban,
        account_name=data.account_name,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


# ---------------------------------------------------------------------------
# External transfers
# ---------------------------------------------------------------------------


def transfer_out(db: Session, user: User, data: ExternalTransferCreate) -> Account:
    external_account = db.scalar(
        select(ExternalBankAccount).where(
            ExternalBankAccount.id == data.external_account_id,
            ExternalBankAccount.user_id == user.id,
        )
    )
    if external_account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bank account not found",
        )

    wallet = get_wallet(db, user, lock=True)
    try:
        transaction = move_money(
            db,
            amount=data.amount,
            type_=TransactionType.EXTERNAL_TRANSFER,
            created_by=user,
            from_account=wallet,
            description=data.description
            or f"Transfer to {external_account.account_name or external_account.iban}",
        )
    except InsufficientFundsError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Not enough money in your wallet",
        ) from None

    db.add(
        ExternalTransfer(
            id=uuid4(),
            transaction_id=transaction.id,
            external_account_id=external_account.id,
        )
    )
    db.commit()
    db.refresh(wallet)
    return wallet


def list_transactions(
    db: Session,
    user: User,
    *,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedTransactionsRead:
    wallet = get_wallet(db, user)

    filter_condition = or_(
        Transaction.from_account_id == wallet.id,
        Transaction.to_account_id == wallet.id,
    )

    total = db.scalar(select(func.count(Transaction.id)).where(filter_condition)) or 0

    offset = (page - 1) * page_size
    items = list(
        db.scalars(
            select(Transaction)
            .where(filter_condition)
            .order_by(desc(Transaction.created_at), desc(Transaction.id))
            .offset(offset)
            .limit(page_size)
        )
    )

    pages = math.ceil(total / page_size) if total > 0 else 0

    return PaginatedTransactionsRead(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def get_transaction(db: Session, user: User, transaction_id: UUID) -> Transaction:
    wallet = get_wallet(db, user)

    transaction = db.scalar(
        select(Transaction).where(
            Transaction.id == transaction_id,
            or_(
                Transaction.from_account_id == wallet.id,
                Transaction.to_account_id == wallet.id,
            ),
        )
    )
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )
    return transaction
