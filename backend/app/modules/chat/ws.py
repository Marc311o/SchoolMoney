import asyncio
import logging
from collections import defaultdict
from typing import Any
from uuid import UUID

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ChatConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[UUID, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, user_id: UUID, websocket: WebSocket) -> None:
        self._loop = asyncio.get_running_loop()
        await websocket.accept()
        self._connections[user_id].add(websocket)

    def disconnect(self, user_id: UUID, websocket: WebSocket) -> None:
        sockets = self._connections.get(user_id)
        if sockets:
            sockets.discard(websocket)
            if not sockets:
                self._connections.pop(user_id, None)

    async def send_to_users(self, user_ids: set[UUID], payload: dict[str, Any]) -> None:
        for user_id in user_ids:
            sockets = list(self._connections.get(user_id, ()))
            for ws in sockets:
                try:
                    await ws.send_json(payload)
                except Exception:
                    logger.debug("Removing dead WebSocket for user %s", user_id)
                    self.disconnect(user_id, ws)

    def broadcast_sync(self, user_ids: set[UUID], payload: dict[str, Any]) -> None:
        """Safe to call from synchronous FastAPI routes/services."""
        if not user_ids or self._loop is None or self._loop.is_closed():
            return
        try:
            running_loop = asyncio.get_running_loop()
        except RuntimeError:
            running_loop = None

        if running_loop is self._loop:
            self._loop.create_task(self.send_to_users(user_ids, payload))
        else:
            asyncio.run_coroutine_threadsafe(self.send_to_users(user_ids, payload), self._loop)


manager = ChatConnectionManager()
