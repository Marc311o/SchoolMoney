from enum import StrEnum


class FundraiserStatus(StrEnum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"


class TreasurerOperationDirection(StrEnum):
    WITHDRAWAL = "WITHDRAWAL"
    DEPOSIT = "DEPOSIT"
