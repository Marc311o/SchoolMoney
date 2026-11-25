from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import Select, and_, distinct, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.orm import Session

from app.common.search import contains_ilike
from app.modules.chat.enums import ChatKind
from app.modules.chat.models import Chat, ChatParticipant, Message
from app.modules.chat.schemas import (
    ChatContactRead,
    ChatParticipantRead,
    ChatRead,
    DirectChatCreate,
    MessageCreate,
    MessagePage,
    MessageRead,
    MessageUpdate,
)
from app.modules.chat.ws import manager
from app.modules.children.models import Child
from app.modules.classrooms.enums import MembershipStatus
from app.modules.classrooms.models import ChildClassMembership, SchoolClass
from app.modules.users.enums import UserRole, UserStatus
from app.modules.users.models import User
from app.modules.users.schemas import UserSummaryRead

ADMIN_CHAT_TITLE = "Administrator"
EDIT_DELETE_WINDOW = timedelta(minutes=15)


def _now() -> datetime:
    return datetime.now(UTC)


def _chat_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")


def _message_not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")


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


def _children_by_parent_in_classes(
    db: Session, class_ids: list[UUID]
) -> dict[tuple[UUID, UUID], list[str]]:
    """Map (class_id, parent_id) -> sorted unique child full names in that class."""
    if not class_ids:
        return {}
    rows = db.execute(
        select(
            ChildClassMembership.class_id,
            Child.parent_id,
            Child.first_name,
            Child.last_name,
        )
        .join(Child, Child.id == ChildClassMembership.child_id)
        .where(
            ChildClassMembership.class_id.in_(class_ids),
            ChildClassMembership.status == MembershipStatus.ACTIVE,
            Child.deleted_at.is_(None),
        )
        .order_by(Child.first_name, Child.last_name)
    ).all()

    result: dict[tuple[UUID, UUID], list[str]] = defaultdict(list)
    for class_id, parent_id, first_name, last_name in rows:
        full = f"{first_name} {last_name}".strip()
        if full not in result[(class_id, parent_id)]:
            result[(class_id, parent_id)].append(full)
    return result


def _ensure_class_chats(db: Session, class_ids: list[UUID]) -> None:
    """Every class has a chat; it is created the first time someone looks."""
    if not class_ids:
        return
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


def _visible_chats(db: Session, user: User, *, include_empty: bool = False) -> Select[tuple[Chat]]:
    class_ids = _my_class_ids(db, user)
    _ensure_class_chats(db, class_ids)
    my_chats = select(ChatParticipant.chat_id).where(ChatParticipant.user_id == user.id)
    has_messages = select(Message.id).where(Message.chat_id == Chat.id).exists()

    direct_filter = and_(Chat.kind.in_((ChatKind.DIRECT, ChatKind.ADMIN)), Chat.id.in_(my_chats))
    if not include_empty:
        direct_filter = and_(direct_filter, has_messages)

    visible = [
        and_(Chat.kind == ChatKind.CLASS, Chat.class_id.in_(class_ids)),
        direct_filter,
    ]
    if user.role == UserRole.ADMIN:
        admin_filter = Chat.kind == ChatKind.ADMIN
        if not include_empty:
            admin_filter = and_(admin_filter, has_messages)
        visible.append(admin_filter)
    return select(Chat).where(or_(*visible))


def get_visible_chat(db: Session, user: User, chat_id: UUID) -> Chat:
    """404 for chats that do not exist and for chats I may not see."""
    chat = db.scalar(_visible_chats(db, user, include_empty=True).where(Chat.id == chat_id))
    if chat is None:
        raise _chat_not_found()
    return chat


def _chat_recipient_ids(db: Session, chat: Chat) -> set[UUID]:
    """All user IDs allowed to receive live WebSocket events for a given chat."""
    if chat.kind == ChatKind.CLASS and chat.class_id is not None:
        treasurer_id = db.scalar(
            select(SchoolClass.treasurer_id).where(SchoolClass.id == chat.class_id)
        )
        parent_ids = db.scalars(
            select(Child.parent_id)
            .join(ChildClassMembership, ChildClassMembership.child_id == Child.id)
            .where(
                ChildClassMembership.class_id == chat.class_id,
                ChildClassMembership.status == MembershipStatus.ACTIVE,
                Child.deleted_at.is_(None),
            )
        ).all()
        recipients = set(parent_ids)
        if treasurer_id is not None:
            recipients.add(treasurer_id)
        return recipients

    participant_ids = set(
        db.scalars(select(ChatParticipant.user_id).where(ChatParticipant.chat_id == chat.id)).all()
    )
    if chat.kind == ChatKind.ADMIN:
        admin_ids = db.scalars(select(User.id).where(User.role == UserRole.ADMIN)).all()
        participant_ids.update(admin_ids)
    return participant_ids


# ---------------------------------------------------------------------------
# Conversation list
# ---------------------------------------------------------------------------


def _message_read(message: Message, sender: User | None) -> MessageRead:
    return MessageRead(
        id=message.id,
        chat_id=message.chat_id,
        sender=UserSummaryRead.model_validate(sender) if sender is not None else None,
        is_system=message.is_system,
        content="" if message.deleted_at is not None else message.content,
        created_at=message.created_at,
        edited_at=message.edited_at,
        deleted_at=message.deleted_at,
    )


def _summaries(db: Session, user: User, chats: list[Chat]) -> list[ChatRead]:
    """Title, last message, participants and unread count for many chats."""
    if not chats:
        return []
    chat_ids = [chat.id for chat in chats]

    last_messages = {
        message.chat_id: _message_read(message, sender)
        for message, sender in db.execute(
            select(Message, User)
            .outerjoin(User, User.id == Message.sender_id)
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
                or_(Message.sender_id.is_(None), Message.sender_id != user.id),
                or_(
                    ChatParticipant.last_read_at.is_(None),
                    Message.created_at > ChatParticipant.last_read_at,
                ),
            )
            .group_by(Message.chat_id)
        ).all()
    )

    participant_rows = db.execute(
        select(ChatParticipant.chat_id, User, ChatParticipant.last_read_at)
        .join(User, User.id == ChatParticipant.user_id)
        .where(ChatParticipant.chat_id.in_(chat_ids))
    ).all()

    read_receipts_by_chat: dict[UUID, dict[UUID, tuple[User, datetime | None]]] = {}
    others: dict[UUID, User] = {}
    for chat_id, participant_user, last_read_at in participant_rows:
        read_receipts_by_chat.setdefault(chat_id, {})[participant_user.id] = (
            participant_user,
            last_read_at,
        )
        if participant_user.id != user.id and participant_user.role != UserRole.ADMIN:
            others[chat_id] = participant_user

    my_class_ids = _my_class_ids(db, user) if user.role != UserRole.ADMIN else []
    relevant_class_ids = list(
        {
            *my_class_ids,
            *(chat.class_id for chat in chats if chat.class_id is not None),
        }
    )
    children_map = _children_by_parent_in_classes(db, relevant_class_ids)

    shared_children_by_parent: dict[UUID, list[str]] = defaultdict(list)
    for (c_id, p_id), names in children_map.items():
        if c_id in my_class_ids:
            for name in names:
                if name not in shared_children_by_parent[p_id]:
                    shared_children_by_parent[p_id].append(name)

    class_chats = [chat for chat in chats if chat.kind == ChatKind.CLASS and chat.class_id]
    class_members: dict[UUID, dict[UUID, User]] = {}
    if class_chats:
        class_ids = [chat.class_id for chat in class_chats if chat.class_id is not None]
        for class_id, treasurer in db.execute(
            select(SchoolClass.id, User)
            .join(User, User.id == SchoolClass.treasurer_id)
            .where(SchoolClass.id.in_(class_ids))
        ):
            class_members.setdefault(class_id, {})[treasurer.id] = treasurer

        for class_id, parent in db.execute(
            select(ChildClassMembership.class_id, User)
            .join(Child, Child.id == ChildClassMembership.child_id)
            .join(User, User.id == Child.parent_id)
            .where(
                ChildClassMembership.class_id.in_(class_ids),
                ChildClassMembership.status == MembershipStatus.ACTIVE,
                Child.deleted_at.is_(None),
            )
        ):
            class_members.setdefault(class_id, {})[parent.id] = parent

    treasurer_classes: dict[UUID, list[str]] = {}
    if user.role == UserRole.ADMIN:
        treasurer_ids = [
            others[chat.id].id
            for chat in chats
            if chat.kind == ChatKind.ADMIN and chat.id in others
        ]
        if treasurer_ids:
            for treasurer_id, name in db.execute(
                select(SchoolClass.treasurer_id, SchoolClass.name)
                .where(SchoolClass.treasurer_id.in_(treasurer_ids))
                .order_by(SchoolClass.name)
            ):
                treasurer_classes.setdefault(treasurer_id, []).append(name)

    classes = {}
    if class_chats:
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
                .where(SchoolClass.id.in_([chat.class_id for chat in class_chats if chat.class_id]))
                .group_by(SchoolClass.id)
            )
        }

    summaries = []
    for chat in chats:
        other = others.get(chat.id)
        children_count = parents_count = None
        receipts = read_receipts_by_chat.get(chat.id, {})

        if chat.kind == ChatKind.CLASS and chat.class_id is not None:
            name, children_count, parents_count = classes[chat.class_id]
            title, other_user = f"Class {name}", None
            members_map = dict(class_members.get(chat.class_id, {}))
            for uid, (u_obj, _) in receipts.items():
                members_map.setdefault(uid, u_obj)
            participants = [
                ChatParticipantRead(
                    user=UserSummaryRead.model_validate(member_user),
                    children=children_map.get((chat.class_id, member_id), []),
                    last_read_at=receipts.get(member_id, (member_user, None))[1],
                )
                for member_id, member_user in members_map.items()
            ]
        else:
            if chat.kind == ChatKind.ADMIN and user.role != UserRole.ADMIN:
                title, other_user = ADMIN_CHAT_TITLE, None
            else:
                title = f"{other.first_name} {other.last_name}" if other else "Deleted user"
                other_user = UserSummaryRead.model_validate(other) if other else None
            participants = [
                ChatParticipantRead(
                    user=UserSummaryRead.model_validate(p_user),
                    children=shared_children_by_parent.get(p_user.id, [])
                    if chat.kind == ChatKind.DIRECT
                    else [],
                    last_read_at=p_read_at,
                )
                for p_user, p_read_at in receipts.values()
            ]

        last_message = last_messages.get(chat.id)
        blocked = (
            other_user is not None and other is not None and other.status == UserStatus.BLOCKED
        )
        runs = (
            treasurer_classes.get(other.id, [])
            if chat.kind == ChatKind.ADMIN and user.role == UserRole.ADMIN and other
            else None
        )
        summaries.append(
            ChatRead(
                id=chat.id,
                kind=chat.kind,
                title=title,
                class_id=chat.class_id,
                other_user=other_user,
                other_user_blocked=blocked,
                treasurer_classes=runs,
                children_count=children_count,
                parents_count=parents_count,
                participants=participants,
                last_message=last_message,
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
    chats = list(db.scalars(statement))
    summaries = _summaries(db, user, chats)
    db.commit()  # class chats created on the way

    if query and query.strip():
        raw_query = query.strip()
        needle = raw_query.casefold()
        chat_ids = [chat.id for chat in summaries]
        matched_by_message_ids: set[UUID] = set()
        if chat_ids:
            matched_by_message_ids = set(
                db.scalars(
                    select(Message.chat_id)
                    .distinct()
                    .where(
                        Message.chat_id.in_(chat_ids),
                        Message.deleted_at.is_(None),
                        contains_ilike(Message.content, raw_query),
                    )
                ).all()
            )
        summaries = [
            chat
            for chat in summaries
            if needle in chat.title.casefold() or chat.id in matched_by_message_ids
        ]

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
        .outerjoin(User, User.id == Message.sender_id)
        .where(Message.chat_id == chat.id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit + 1)
    )
    if before is not None:
        cursor = db.get(Message, before)
        if cursor is None or cursor.chat_id != chat.id:
            raise _message_not_found()
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
    now = _now()
    message = Message(
        id=uuid4(),
        chat_id=chat.id,
        sender_id=user.id,
        is_system=False,
        content=data.content,
        created_at=now,
    )
    db.add(message)
    db.flush()
    _mark_read(db, user, chat.id, message.created_at)
    recipients = _chat_recipient_ids(db, chat)
    result = _message_read(message, user)
    db.commit()

    manager.broadcast_sync(
        recipients,
        {
            "type": "message.created",
            "chat_id": str(chat.id),
            "message": result.model_dump(mode="json"),
        },
    )
    return result


def edit_message(
    db: Session, user: User, chat_id: UUID, message_id: UUID, data: MessageUpdate
) -> MessageRead:
    chat = get_visible_chat(db, user, chat_id)
    message = db.scalar(select(Message).where(Message.id == message_id, Message.chat_id == chat.id))
    if message is None:
        raise _message_not_found()
    if message.is_system or message.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This message cannot be edited",
        )
    if message.sender_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own messages",
        )
    now = _now()
    if now - message.created_at > EDIT_DELETE_WINDOW:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Message can no longer be edited",
        )

    message.content = data.content
    message.edited_at = now
    db.flush()
    recipients = _chat_recipient_ids(db, chat)
    result = _message_read(message, user)
    db.commit()

    manager.broadcast_sync(
        recipients,
        {
            "type": "message.updated",
            "chat_id": str(chat.id),
            "message": result.model_dump(mode="json"),
        },
    )
    return result


def delete_message(db: Session, user: User, chat_id: UUID, message_id: UUID) -> None:
    chat = get_visible_chat(db, user, chat_id)
    message = db.scalar(select(Message).where(Message.id == message_id, Message.chat_id == chat.id))
    if message is None:
        raise _message_not_found()
    if message.is_system or message.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This message cannot be deleted",
        )

    now = _now()
    is_owner_in_window = (
        message.sender_id == user.id and (now - message.created_at) <= EDIT_DELETE_WINDOW
    )
    is_class_treasurer = (
        chat.kind == ChatKind.CLASS
        and chat.school_class is not None
        and chat.school_class.treasurer_id == user.id
    )

    if not is_owner_in_window and not is_class_treasurer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this message",
        )

    message.deleted_at = now
    message.content = ""
    db.flush()
    recipients = _chat_recipient_ids(db, chat)
    db.commit()

    manager.broadcast_sync(
        recipients,
        {
            "type": "message.deleted",
            "chat_id": str(chat.id),
            "message_id": str(message.id),
            "deleted_at": now.isoformat(),
        },
    )


def mark_read(db: Session, user: User, chat_id: UUID) -> None:
    chat = get_visible_chat(db, user, chat_id)
    now = _now()
    _mark_read(db, user, chat.id, now)
    recipients = _chat_recipient_ids(db, chat)
    db.commit()

    manager.broadcast_sync(
        recipients,
        {
            "type": "chat.read",
            "chat_id": str(chat.id),
            "user_id": str(user.id),
            "last_read_at": now.isoformat(),
        },
    )


def post_class_system_message(db: Session, class_id: UUID, content: str) -> None:
    """Create a system notification message inside a class chat (no sender user)."""
    _ensure_class_chats(db, [class_id])
    chat = db.scalar(
        select(Chat).where(Chat.kind == ChatKind.CLASS, Chat.class_id == class_id).limit(1)
    )
    if chat is None:
        return
    message = Message(
        id=uuid4(),
        chat_id=chat.id,
        sender_id=None,
        is_system=True,
        content=content,
        created_at=_now(),
    )
    db.add(message)
    db.flush()
    recipients = _chat_recipient_ids(db, chat)
    result = _message_read(message, None)
    manager.broadcast_sync(
        recipients,
        {
            "type": "message.created",
            "chat_id": str(chat.id),
            "message": result.model_dump(mode="json"),
        },
    )


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

    chat = _admin_chat_of(db, user.id)
    [summary] = _summaries(db, user, [chat])
    db.commit()
    return summary


def _admin_chat_of(db: Session, treasurer_id: UUID) -> Chat:
    """A treasurer has one chat with all administrators, whoever starts it."""
    return db.scalar(
        select(Chat)
        .join(ChatParticipant, ChatParticipant.chat_id == Chat.id)
        .where(Chat.kind == ChatKind.ADMIN, ChatParticipant.user_id == treasurer_id)
        .limit(1)
    ) or _create_chat(db, ChatKind.ADMIN, [treasurer_id])


def open_treasurer_chat(db: Session, admin: User, treasurer_id: UUID) -> ChatRead:
    """An administrator opens the chat with a treasurer: the existing one, or a new one.
    The same chat the treasurer reaches with "Message the administrator"."""
    treasurer = db.get(User, treasurer_id)
    if treasurer is None or treasurer.role != UserRole.PARENT or not is_treasurer(db, treasurer):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treasurer not found")

    chat = _admin_chat_of(db, treasurer.id)
    [summary] = _summaries(db, admin, [chat])
    db.commit()
    return summary


def search_contacts(db: Session, user: User, query: str, limit: int = 20) -> list[ChatContactRead]:
    """Parents and treasurers who share at least one school class with me, by name."""
    class_ids = _my_class_ids(db, user)
    if not class_ids:
        return []

    class_treasurers = select(SchoolClass.treasurer_id).where(SchoolClass.id.in_(class_ids))
    class_parents = (
        select(Child.parent_id)
        .join(ChildClassMembership, ChildClassMembership.child_id == Child.id)
        .where(
            ChildClassMembership.class_id.in_(class_ids),
            ChildClassMembership.status == MembershipStatus.ACTIVE,
            Child.deleted_at.is_(None),
        )
    )
    allowed_user_ids = class_treasurers.union(class_parents)

    full_name = func.concat(User.first_name, " ", User.last_name)
    users = list(
        db.scalars(
            select(User)
            .where(
                User.id != user.id,
                User.id.in_(allowed_user_ids),
                User.status == UserStatus.ACTIVE,
                User.role == UserRole.PARENT,
                contains_ilike(full_name, query.strip()),
            )
            .order_by(User.last_name, User.first_name)
            .limit(limit)
        )
    )
    if not users:
        return []

    children_map = _children_by_parent_in_classes(db, class_ids)
    children_by_user: dict[UUID, list[str]] = defaultdict(list)
    for (_, parent_id), names in children_map.items():
        for name in names:
            if name not in children_by_user[parent_id]:
                children_by_user[parent_id].append(name)

    return [
        ChatContactRead(
            **UserSummaryRead.model_validate(contact).model_dump(),
            children=children_by_user.get(contact.id, []),
        )
        for contact in users
    ]
