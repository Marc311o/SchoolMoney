from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.accounts import service
from app.modules.accounts.models import Account, ExternalBankAccount
from app.modules.accounts.schemas import (
    AccountRead,
    ExternalBankAccountCreate,
    ExternalBankAccountRead,
    ExternalTransferCreate,
    TopUpCreate,
)
from app.modules.auth.dependencies import get_current_user
from app.modules.users.models import User

router = APIRouter(prefix="/accounts/me", tags=["wallet"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=AccountRead, summary="Get my wallet (IBAN and balance)")
def get_wallet(user: CurrentUser, db: DbSession) -> Account:
    return service.get_wallet(db, user)


@router.post(
    "/top-up",
    response_model=AccountRead,
    summary="Top up my wallet (virtual transfer in); returns the wallet",
)
def top_up(data: TopUpCreate, user: CurrentUser, db: DbSession) -> Account:
    return service.top_up(db, user, data)


@router.get(
    "/external-accounts",
    response_model=list[ExternalBankAccountRead],
    summary="List my real bank accounts (where money can be sent)",
)
def list_external_accounts(user: CurrentUser, db: DbSession) -> list[ExternalBankAccount]:
    return service.list_external_accounts(db, user)


@router.post(
    "/external-accounts",
    response_model=ExternalBankAccountRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a real bank account",
    responses={
        409: {"description": "This bank account is already added"},
        422: {"description": "Invalid IBAN, or it is a SchoolMoney account number"},
    },
)
def add_external_account(
    data: ExternalBankAccountCreate, user: CurrentUser, db: DbSession
) -> ExternalBankAccount:
    return service.add_external_account(db, user, data)


@router.post(
    "/external-transfers",
    response_model=AccountRead,
    summary="Send money from my wallet to my bank account; returns the wallet",
    responses={
        404: {"description": "Bank account not found (or not mine)"},
        409: {"description": "Not enough money in the wallet"},
    },
)
def transfer_out(data: ExternalTransferCreate, user: CurrentUser, db: DbSession) -> Account:
    return service.transfer_out(db, user, data)
