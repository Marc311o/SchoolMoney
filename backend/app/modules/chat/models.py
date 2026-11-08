from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, Uuid, func, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.modules.chat.enums import ChatKind


class Chat(Base):
    __tablename__ = "chats"
    __table_args__ = (
        CheckConstraint(
            "(kind = 'CLASS') = (class_id IS NOT NULL)",
            name="class_id_matches_kind",
        ),
        Index(
            "uq_chats_one_per_class",
            "class_id",
            unique=True,
            postgresql_where=text("kind = 'CLASS'"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    kind: Mapped[ChatKind] = mapped_column(
        SAEnum(ChatKind, name="chat_kind"),
        nullable=False,
    )

    class_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    school_class = relationship(
        "SchoolClass",
        back_populates="chats",
    )

    participants = relationship(
        "ChatParticipant",
        back_populates="chat",
    )

    messages = relationship(
        "Message",
        back_populates="chat",
    )


class ChatParticipant(Base):
    __tablename__ = "chat_participants"

    chat_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("chats.id"),
        primary_key=True,
        nullable=False,
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        primary_key=True,
        nullable=False,
    )

    last_read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    chat = relationship(
        "Chat",
        back_populates="participants",
    )

    user = relationship(
        "User",
        back_populates="chat_participations",
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (Index("ix_messages_chat_id_created_at", "chat_id", "created_at"),)

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
    )

    chat_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("chats.id"),
        nullable=False,
    )

    sender_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    chat = relationship(
        "Chat",
        back_populates="messages",
    )

    sender = relationship(
        "User",
        back_populates="messages_sent",
    )
