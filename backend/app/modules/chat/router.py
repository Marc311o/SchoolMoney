from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.modules.auth.dependencies import authenticate_access_token, get_current_user
from app.modules.chat import service
from app.modules.chat.enums import ChatKind
from app.modules.chat.schemas import (
    ChatContactRead,
    ChatRead,
    DirectChatCreate,
    MessageCreate,
    MessagePage,
    MessageRead,
    MessageUpdate,
)
from app.modules.chat.ws import manager
from app.modules.users.models import User

router = APIRouter(prefix="/chats", tags=["chat"])

CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[Session, Depends(get_db)]


@router.websocket("/ws")
async def chat_websocket(
    websocket: WebSocket,
    token: Annotated[str | None, Query()] = None,
) -> None:
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    with SessionLocal() as db:
        try:
            user = authenticate_access_token(db, token)
            user_id = user.id
        except HTTPException:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)


@router.get("", response_model=list[ChatRead], summary="My conversations, newest activity first")
def list_chats(
    user: CurrentUser,
    db: DbSession,
    kind: ChatKind | None = None,
    q: Annotated[
        str | None, Query(max_length=100, description="Filter by title or message content")
    ] = None,
) -> list[ChatRead]:
    return service.list_chats(db, user, kind, q)


@router.get(
    "/contacts",
    response_model=list[ChatContactRead],
    summary="Parents in my classes to start a direct chat with, by name",
)
def search_contacts(
    user: CurrentUser,
    db: DbSession,
    q: Annotated[str, Query(min_length=2, max_length=100)],
) -> list[ChatContactRead]:
    return service.search_contacts(db, user, q)


@router.post(
    "/direct",
    response_model=ChatRead,
    summary="Open the direct chat with a parent (existing or new)",
    responses={404: {"description": "User not found"}, 422: {"description": "That is you"}},
)
def open_direct_chat(data: DirectChatCreate, user: CurrentUser, db: DbSession) -> ChatRead:
    return service.open_direct_chat(db, user, data)


@router.post(
    "/admin",
    response_model=ChatRead,
    summary="Open my chat with the administrator (treasurers only)",
    responses={403: {"description": "Not a treasurer"}},
)
def open_admin_chat(user: CurrentUser, db: DbSession) -> ChatRead:
    return service.open_admin_chat(db, user)


@router.get(
    "/{chat_id}", response_model=ChatRead, responses={404: {"description": "Chat not found"}}
)
def get_chat(chat_id: UUID, user: CurrentUser, db: DbSession) -> ChatRead:
    return service.get_chat(db, user, chat_id)


@router.get(
    "/{chat_id}/messages",
    response_model=MessagePage,
    summary="Messages, oldest first; pass `before` (a message id) for older ones",
    responses={404: {"description": "Chat or message not found"}},
)
def list_messages(
    chat_id: UUID,
    user: CurrentUser,
    db: DbSession,
    before: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> MessagePage:
    return service.list_messages(db, user, chat_id, before, limit)


@router.post(
    "/{chat_id}/messages",
    response_model=MessageRead,
    status_code=status.HTTP_201_CREATED,
    responses={404: {"description": "Chat not found"}},
)
def send_message(
    chat_id: UUID, data: MessageCreate, user: CurrentUser, db: DbSession
) -> MessageRead:
    return service.send_message(db, user, chat_id, data)


@router.patch(
    "/{chat_id}/messages/{message_id}",
    response_model=MessageRead,
    responses={
        403: {"description": "Forbidden"},
        404: {"description": "Chat or message not found"},
        409: {"description": "Message cannot be edited"},
    },
)
def edit_message(
    chat_id: UUID,
    message_id: UUID,
    data: MessageUpdate,
    user: CurrentUser,
    db: DbSession,
) -> MessageRead:
    return service.edit_message(db, user, chat_id, message_id, data)


@router.delete(
    "/{chat_id}/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        403: {"description": "Forbidden"},
        404: {"description": "Chat or message not found"},
        409: {"description": "Message cannot be deleted"},
    },
)
def delete_message(
    chat_id: UUID,
    message_id: UUID,
    user: CurrentUser,
    db: DbSession,
) -> Response:
    service.delete_message(db, user, chat_id, message_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{chat_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Mark everything in the chat as read",
    responses={404: {"description": "Chat not found"}},
)
def mark_read(chat_id: UUID, user: CurrentUser, db: DbSession) -> Response:
    service.mark_read(db, user, chat_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
