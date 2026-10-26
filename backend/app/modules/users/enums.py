from enum import StrEnum


class UserRole(StrEnum):
    PARENT = "PARENT"
    ADMIN = "ADMIN"


class UserStatus(StrEnum):
    ACTIVE = "ACTIVE"
    BLOCKED = "BLOCKED"