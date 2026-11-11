from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.fundraisers import service
from app.modules.fundraisers.schemas import (
    FundraiserChildrenListRead,
    FundraiserCloseResult,
    FundraiserCreate,
    FundraiserDetailRead,
    FundraiserPaymentCreate,
    FundraiserPaymentRead,
    FundraiserRead,
    FundraiserUpdate,
    InvoiceCreate,
    InvoiceRead,
    TreasurerDepositCreate,
    TreasurerOperationRead,
    TreasurerWithdrawalCreate,
)
from app.modules.users.models import User

router = APIRouter(prefix="/fundraisers", tags=["fundraisers"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("")
def list_fundraisers(
    user: CurrentUser, db: DbSession, class_id: UUID | None = None
) -> list[FundraiserRead]:
    return service.list_fundraisers(db, user, class_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_fundraiser(
    payload: FundraiserCreate, user: CurrentUser, db: DbSession
) -> FundraiserRead:
    return service.create_fundraiser(db, user, payload)


@router.get("/{fundraiser_id}")
def get_fundraiser(fundraiser_id: UUID, user: CurrentUser, db: DbSession) -> FundraiserDetailRead:
    return service.get_fundraiser(db, user, fundraiser_id)


@router.patch("/{fundraiser_id}")
def update_fundraiser(
    fundraiser_id: UUID, payload: FundraiserUpdate, user: CurrentUser, db: DbSession
) -> FundraiserRead:
    return service.update_fundraiser(db, user, fundraiser_id, payload)


@router.delete("/{fundraiser_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fundraiser(fundraiser_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    service.delete_fundraiser(db, user, fundraiser_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Payments and refunds
@router.get("/{fundraiser_id}/payments")
def list_payments(
    fundraiser_id: UUID, user: CurrentUser, db: DbSession
) -> list[FundraiserPaymentRead]:
    return service.list_payments(db, user, fundraiser_id)


@router.post("/{fundraiser_id}/payments", status_code=status.HTTP_201_CREATED)
def pay_for_child(
    fundraiser_id: UUID, payload: FundraiserPaymentCreate, user: CurrentUser, db: DbSession
) -> FundraiserPaymentRead:
    return service.pay_for_child(db, user, fundraiser_id, payload)


@router.post("/{fundraiser_id}/payments/{payment_id}/refund")
def refund_payment(
    fundraiser_id: UUID, payment_id: UUID, user: CurrentUser, db: DbSession
) -> FundraiserPaymentRead:
    return service.refund_payment(db, user, fundraiser_id, payment_id)


# Treasurer operations
@router.post("/{fundraiser_id}/withdrawals", status_code=status.HTTP_201_CREATED)
def create_withdrawal(
    fundraiser_id: UUID, payload: TreasurerWithdrawalCreate, user: CurrentUser, db: DbSession
) -> TreasurerOperationRead:
    return service.create_withdrawal(db, user, fundraiser_id, payload)


@router.post("/{fundraiser_id}/deposits", status_code=status.HTTP_201_CREATED)
def create_deposit(
    fundraiser_id: UUID, payload: TreasurerDepositCreate, user: CurrentUser, db: DbSession
) -> TreasurerOperationRead:
    return service.create_deposit(db, user, fundraiser_id, payload)


@router.post("/{fundraiser_id}/close")
def close_fundraiser(
    fundraiser_id: UUID, user: CurrentUser, db: DbSession
) -> FundraiserCloseResult:
    return service.close_fundraiser(db, user, fundraiser_id)


# Invoices
@router.get("/{fundraiser_id}/invoices")
def list_invoices(fundraiser_id: UUID, user: CurrentUser, db: DbSession) -> list[InvoiceRead]:
    return service.list_invoices(db, user, fundraiser_id)


@router.post("/{fundraiser_id}/invoices", status_code=status.HTTP_201_CREATED)
def create_invoice(
    fundraiser_id: UUID, payload: InvoiceCreate, user: CurrentUser, db: DbSession
) -> InvoiceRead:
    return service.create_invoice(db, user, fundraiser_id, payload)


# Operation List
@router.get("/{fundraiser_id}/operations")
def list_treasurer_operations(
    fundraiser_id: UUID, user: CurrentUser, db: DbSession
) -> list[TreasurerOperationRead]:
    return service.list_treasurer_operations(db, user, fundraiser_id)


@router.get("/{fundraiser_id}/children")
def list_fundraiser_children(
    fundraiser_id: UUID, user: CurrentUser, db: DbSession
) -> FundraiserChildrenListRead:
    return service.get_fundraiser_children(db, user, fundraiser_id)
