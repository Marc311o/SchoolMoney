from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import Field, StringConstraints

from app.common.schemas import SchemaBase

MessageContent = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]


class DirectChatCreate(SchemaBase):
    participant_id: UUID


class ClassChatCreate(SchemaBase):
    class_id: UUID


class ChatRead(SchemaBase):
    id: UUID
    class_id: UUID | None
    created_at: datetime


class ChatParticipantRead(SchemaBase):
    chat_id: UUID
    user_id: UUID
    last_read_at: datetime | None


class MessageCreate(SchemaBase):
    content: MessageContent


class MessageRead(SchemaBase):
    id: UUID
    chat_id: UUID
    sender_id: UUID
    content: str
    created_at: datetime


class ChatDetailRead(ChatRead):
    participants: list[ChatParticipantRead] = Field(default_factory=list)
    messages: list[MessageRead] = Field(default_factory=list)


class UnreadCountRead(SchemaBase):
    chat_id: UUID
    unread_count: int = Field(ge=0)
