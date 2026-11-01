from enum import StrEnum


class MembershipStatus(StrEnum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    LEFT = "LEFT"


class ClassRole(StrEnum):
    TREASURER = "TREASURER"
    PARENT = "PARENT"
