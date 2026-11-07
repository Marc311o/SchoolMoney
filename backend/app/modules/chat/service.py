from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, distinct, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.orm import Session

from app.modules.chat.enums import ChatKind
from app.modules.chat.models import Chat, ChatParticipant, Message
from app.modules.chat.schemas import (
    ChatRead,
    DirectChatCreate,
    MessageCreate,
    MessagePage,
    MessageRead,
)
from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import UserSummaryRead

ADMIN_CHAT_TITLE = "Administrator"


def _now() -> datetime:
    return datetime.now(UTC)


def _chat_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")


# ---------------------------------------------------------------------------
# Who sees what
# ---------------------------------------------------------------------------


def is_treasurer(db: Session, user: User) -> bool:
    first_class = select(SchoolClass.id).where(SchoolClass.treasurer_id == user.id).limit(1)
    return db.scalar(first_class) is not None


def _my_class_ids(db: Session, user: User) -> list[UUID]:
    """Classes I run, plus classes where one of my children is an ACTIVE member."""
    as_treasurer = select(SchoolClass.id).where(SchoolClass.treasurer_id == user.id)
    as_parent = (
        select(ChildClassMembership.class_id)
        .join(Child, Child.id == ChildClassMembership.child_id)
        .where(
            Child.parent_id == user.id,
            Child.deleted_at.is_(None),
            ChildClassMembership.status == MembershipStatus.ACTIVE,
        )
    )
    return list(db.scalars(as_treasurer.union(as_parent)))


def _ensure_class_chats(db: Session, class_ids: list[UUID]) -> None:
    """Every class has a chat; it is created the first time someone looks."""
    existing = db.scalars(
        select(Chat.class_id).where(Chat.kind == ChatKind.CLASS, Chat.class_id.in_(class_ids))
    )
    missing = set(class_ids) - set(existing)
    if not missing:
        return
    db.execute(
        insert(Chat)
        .values([{"id": uuid4(), "kind": ChatKind.CLASS, "class_id": id_} for id_ in missing])
        .on_conflict_do_nothing(
            index_elements=["class_id"], index_where=Chat.kind == ChatKind.CLASS
        )
    )


def _visible_chats(db: Session, user: User) -> Select[tuple[Chat]]:
    class_ids = _my_class_ids(db, user)
    _ensure_class_chats(db, class_ids)
    my_chats = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user.id)
    visible = [
        and_(Chat.kind == ChatKind.CLASS, Chat.class_id.in_(class_ids)),
        and_(Chat.kind.in_((ChatKind.DIRECT, ChatKind.ADMIN)), Chat.id.in_(my_chats)),
    ]
    if user.role == UserRole.ADMIN:
        # administrators see every treasurer's admin chat
        visible.append(Chat.kind == ChatKind.ADMIN)
    return select(Chat).where(or_(*visible))


def get_visible_chat(db: Session, user: User, chat_id: UUID) -> Chat:
    """404 for chats that do not exist and for chats I may not see."""
    chat = db.scalar(_visible_chats(db, user).where(Chat.id == chat_id))
    if chat is None:
        raise _chat_not_found()
    return chat


# ---------------------------------------------------------------------------
# Conversation list
# ---------------------------------------------------------------------------


def _message_read(message: Message, sender: User) -> MessageRead:
    return MessageRead(
        id=message.id,
        chat_id=message.chat_id,
        sender=UserSummaryRead.model_validate(sender),
        content=message.content,
        created_at=message.created_at,
    )


def _summaries(db: Session, user: User, chats: list[Chat]) -> list[ChatRead]:
    """Title, last message and unread count for many chats in a fixed number of queries."""
    if not chats:
        return []
    chat_ids = [chat.id for chat in chats]

    last_messages = {
        message.chat_id: _message_read(message, sender)
        for message, sender in db.execute(
            select(Message, User)
            .join(User, User.id == Message.sender_id)
            .where(Message.chat_id.in_(chat_ids))
            .order_by(Message.chat_id, Message.created_at.desc(), Message.id.desc())
            .ext(distinct_on(Message.chat_id))
        )
    }

    unread = dict(
        db.execute(
            select(Message.chat_id, func.count())
            .outerjoin(
                ChatParticipant,
                and_(
                    ChatParticipant.chat_id == Message.chat_id,
                    ChatParticipant.user_id == user.id,
                ),
            )
            .where(
                Message.chat_id.in_(chat_ids),
                Message.sender_id != user.id,
                or_(
                    ChatParticipant.last_read_at.is_(None),
                    Message.created_at > ChatParticipant.last_read_at,
                ),
            )
            .group_by(Message.chat_id)
        ).all()
    )

    others: dict[UUID, User] = {}
    for chat_id, other in db.execute(
        select(ChatParticipant.chat_id, User)
        .join(User, User.id == ChatParticipant.user_id)
        .where(
            ChatParticipant.chat_id.in_(chat_ids),
            ChatParticipant.user_id != user.id,
            User.role != UserRole.ADMIN,
        )
    ):
        others[chat_id] = other

    classes = {
        class_id: (name, children, parents)
        for class_id, name, children, parents in db.execute(
            select(
                SchoolClass.id,
                SchoolClass.name,
                func.count(distinct(Child.id)),
                func.count(distinct(Child.parent_id)),
            )
            .outerjoin(
                ChildClassMembership,
                and_(
                    ChildClassMembership.class_id == SchoolClass.id,
                    ChildClassMembership.status == MembershipStatus.ACTIVE,
                ),
            )
            .outerjoin(
                Child,
                and_(Child.id == ChildClassMembership.child_id, Child.deleted_at.is_(None)),
            )
            .where(SchoolClass.id.in_([chat.class_id for chat in chats if chat.class_id]))
            .group_by(SchoolClass.id)
        )
    }

    summaries = []
    for chat in chats:
        other = others.get(chat.id)
        children_count = parents_count = None
        if chat.kind == ChatKind.CLASS:
            name, children_count, parents_count = classes[chat.class_id]
            title, other_user = f"Class {name}", None
        elif chat.kind == ChatKind.ADMIN and user.role != UserRole.ADMIN:
            title, other_user = ADMIN_CHAT_TITLE, None
        else:
            title = f"{other.first_name} {other.last_name}" if other else "Deleted user"
            other_user = UserSummaryRead.model_validate(other) if other else None

        last_message = last_messages.get(chat.id)
        summaries.append(
            ChatRead(
                id=chat.id,
                kind=chat.kind,
                title=title,
                class_id=chat.class_id,
                other_user=other_user,
                last_message=last_message,
                children_count=children_count,
                parents_count=parents_count,
                unread_count=unread.get(chat.id, 0),
                last_activity_at=last_message.created_at if last_message else chat.created_at,
            )
        )
    return summaries


def list_chats(
    db: Session, user: User, kind: ChatKind | None = None, query: str | None = None
) -> list[ChatRead]:
    statement = _visible_chats(db, user)
    if kind is not None:
        statement = statement.where(Chat.kind == kind)
    summaries = _summaries(db, user, list(db.scalars(statement)))
    db.commit()  # class chats created on the way

    if query:
        needle = query.strip().casefold()
        summaries = [chat for chat in summaries if needle in chat.title.casefold()]
    return sorted(summaries, key=lambda chat: chat.last_activity_at, reverse=True)


def get_chat(db: Session, user: User, chat_id: UUID) -> ChatRead:
    chat = get_visible_chat(db, user, chat_id)
    [summary] = _summaries(db, user, [chat])
    db.commit()
    return summary


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


def list_messages(
    db: Session, user: User, chat_id: UUID, before: UUID | None, limit: int
) -> MessagePage:
    chat = get_visible_chat(db, user, chat_id)
    statement = (
        select(Message, User)
        .join(User, User.id == Message.sender_id)
        .where(Message.chat_id == chat.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit + 1)
    )
    if before is not None:
        cursor = db.get(Message, before)
        if cursor is None or cursor.chat_id != chat.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        statement = statement.where(
            or_(
                Message.created_at < cursor.created_at,
                and_(Message.created_at == cursor.created_at, Message.id < cursor.id),
            )
        )

    rows = db.execute(statement).all()
    db.commit()
    page = rows[:limit]
    return MessagePage(
        messages=[_message_read(message, sender) for message, sender in reversed(page)],
        has_more=len(rows) > limit,
    )


def _mark_read(db: Session, user: User, chat_id: UUID, at: datetime) -> None:
    db.execute(
        insert(ChatParticipant)
        .values(chat_id=chat_id, user_id=user.id, last_read_at=at)
        .on_conflict_do_update(
            index_elements=["chat_id", "user_id"],
            set_={"last_read_at": at},
        )
    )


def send_message(db: Session, user: User, chat_id: UUID, data: MessageCreate) -> MessageRead:
    chat = get_visible_chat(db, user, chat_id)
    message = Message(
        id=uuid4(),
        chat_id=chat.id,
        sender_id=user.id,
        content=data.content,
        created_at=_now(),
    )
    db.add(message)
    db.flush()
    # my own message is not unread for me
    _mark_read(db, user, chat.id, message.created_at)
    db.commit()
    return _message_read(message, user)


def mark_read(db: Session, user: User, chat_id: UUID) -> None:
    chat = get_visible_chat(db, user, chat_id)
    _mark_read(db, user, chat.id, _now())
    db.commit()


# ---------------------------------------------------------------------------
# Starting conversations
# ---------------------------------------------------------------------------


def _create_chat(db: Session, kind: ChatKind, user_ids: list[UUID]) -> Chat:
    chat = Chat(id=uuid4(), kind=kind)
    db.add(chat)
    db.flush()
    db.add_all(ChatParticipant(chat_id=chat.id, user_id=user_id) for user_id in user_ids)
    db.flush()
    return chat


def open_direct_chat(db: Session, user: User, data: DirectChatCreate) -> ChatRead:
    """The existing conversation with that person, or a new one."""
    if data.user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="You cannot start a chat with yourself",
        )
    other = db.get(User, data.user_id)
    if other is None or other.status != UserStatus.ACTIVE or other.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    existing_id = db.scalar(
        select(Chat.id)
        .join(ChatParticipant, ChatParticipant.chat_id == Chat.id)
        .where(Chat.kind == ChatKind.DIRECT, ChatParticipant.user_id.in_((user.id, other.id)))
        .group_by(Chat.id)
        .having(func.count() == 2)
        .limit(1)
    )
    if existing_id:
        chat = db.get(Chat, existing_id)
    else:
        chat = _create_chat(db, ChatKind.DIRECT, [user.id, other.id])
    [summary] = _summaries(db, user, [chat])
    db.commit()
    return summary


def open_admin_chat(db: Session, user: User) -> ChatRead:
    """Treasurers only. Administrators join the chat when they first read or write in it."""
    if not is_treasurer(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only class treasurers can message the administrator",
        )

    chat = db.scalar(
        select(Chat)
        .join(ChatParticipant, ChatParticipant.chat_id == Chat.id)
        .where(Chat.kind == ChatKind.ADMIN, ChatParticipant.user_id == user.id)
        .limit(1)
    ) or _create_chat(db, ChatKind.ADMIN, [user.id])
    [summary] = _summaries(db, user, [chat])
    db.commit()
    return summary


def search_contacts(db: Session, user: User, query: str, limit: int = 20) -> list[User]:
    """Parents I can start a direct chat with: anyone active, by name."""
    full_name = func.concat(User.first_name, " ", User.last_name)
    return list(
        db.scalars(
            select(User)
            .where(
                User.id != user.id,
                User.status == UserStatus.ACTIVE,
                User.role == UserRole.PARENT,
                full_name.ilike(f"%{query.strip()}%"),
            )
            .order_by(User.last_name, User.first_name)
            .limit(limit)
        )
    )
