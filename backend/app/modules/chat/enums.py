from enum import StrEnum


class ChatKind(StrEnum):
    CLASS = "CLASS"  # class chat
    DIRECT = "DIRECT"  # parent <-> parent
    ADMIN = "ADMIN"  # treasurer <-> admin
