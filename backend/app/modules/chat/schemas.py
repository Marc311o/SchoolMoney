from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import StringConstraints

from app.common.schemas import SchemaBase
from app.modules.chat.enums import ChatKind
from app.modules.users.schemas import UserSummaryRead

MessageContent = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=2000),
]


class DirectChatCreate(SchemaBase):
    user_id: UUID


class MessageCreate(SchemaBase):
    content: MessageContent


class MessageRead(SchemaBase):
    id: UUID
    chat_id: UUID
    sender: UserSummaryRead
    content: str
    created_at: datetime


class MessagePage(SchemaBase):
    """Oldest first. `has_more` = older messages exist (ask again with `before`)."""

    messages: list[MessageRead]
    has_more: bool


class ChatRead(SchemaBase):
    """One row of the conversation list, also the header of an open conversation."""

    id: UUID
    kind: ChatKind
    title: str
    class_id: UUID | None
    other_user: UserSummaryRead | None
    other_user_blocked: bool = False
    treasurer_classes: list[str] | None = None
    children_count: int | None = None
    parents_count: int | None = None
    last_message: MessageRead | None
    unread_count: int
    last_activity_at: datetime
