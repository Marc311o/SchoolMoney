import { useEffect, useRef } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'

import type { ClassListItem, UserSummary } from '@/features/classes/api'
import { api, ApiError } from '@/lib/api'
import { tokenStorage } from '@/lib/tokens'

export type ChatKind = 'CLASS' | 'DIRECT' | 'ADMIN'

export type ChatMessage = {
  id: string
  chat_id: string
  sender: UserSummary | null
  is_system: boolean
  content: string
  created_at: string
  edited_at: string | null
  deleted_at: string | null
}

export type ChatParticipant = {
  user: UserSummary
  last_read_at: string | null
}

/** GET /chats/{id}/messages: one page, oldest first */
export type MessagePage = {
  messages: ChatMessage[]
  /** Older messages exist: ask again with `before` = id of the first message */
  has_more: boolean
}

/** A row of the conversation list, also the header of an open conversation */
export type ChatSummary = {
  id: string
  kind: ChatKind
  title: string
  class_id: string | null
  /** DIRECT: the other parent. null for CLASS and for my ADMIN chat. */
  other_user: UserSummary | null
  other_user_blocked: boolean
  treasurer_classes: string[] | null
  participants: ChatParticipant[]
  last_message: ChatMessage | null
  unread_count: number
  last_activity_at: string
  children_count: number | null
  parents_count: number | null
}

/** Tabs above the list. ADMIN is shown to treasurers only. */
export type ChatTab = 'ALL' | ChatKind

/** Fallback polling intervals (WebSocket handles live updates) */
const LIST_POLL_MS = 30_000
const MESSAGES_POLL_MS = 15_000
const PAGE_SIZE = 50
export const EDIT_DELETE_WINDOW_MS = 15 * 60 * 1000

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const chatKeys = {
  all: ['chat'] as const,
  list: (query = '') => [...chatKeys.all, 'list', query.trim()] as const,
  detail: (id: string) => [...chatKeys.all, 'detail', id] as const,
  messages: (id: string) => [...chatKeys.all, 'messages', id] as const,
  contacts: (query: string) => [...chatKeys.all, 'contacts', query] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useChats(query = '') {
  const trimmed = query.trim()

  return useQuery<ChatSummary[], ApiError>({
    queryKey: chatKeys.list(trimmed),
    queryFn: () =>
      api.get<ChatSummary[]>(
        trimmed ? `/chats?${new URLSearchParams({ q: trimmed })}` : '/chats',
      ),
    placeholderData: keepPreviousData,
    refetchInterval: LIST_POLL_MS,
  })
}

/** Header of an open conversation. Shows the row from the list at once, if loaded. */
export function useChat(id: string) {
  const queryClient = useQueryClient()

  return useQuery<ChatSummary, ApiError>({
    queryKey: chatKeys.detail(id),
    queryFn: () => api.get<ChatSummary>(`/chats/${id}`),
    placeholderData: () =>
      queryClient
        .getQueryData<ChatSummary[]>(chatKeys.list(''))
        ?.find((chat) => chat.id === id),
    retry: (failureCount, error) => !isChatNotFound(error) && failureCount < 1,
  })
}

export function useChatMessages(chatId: string) {
  return useInfiniteQuery({
    queryKey: chatKeys.messages(chatId),
    queryFn: ({ pageParam }) =>
      api.get<MessagePage>(
        `/chats/${chatId}/messages?${new URLSearchParams({
          limit: String(PAGE_SIZE),
          ...(pageParam ? { before: pageParam } : {}),
        })}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.messages[0].id : undefined,
    select: (data) =>
      [...data.pages].reverse().flatMap((page) => page.messages),
    refetchInterval: MESSAGES_POLL_MS,
    retry: (failureCount, error) => !isChatNotFound(error) && failureCount < 1,
  })
}

/** Parents to start a direct chat with. Runs from 2 characters on. */
export function useChatContacts(query: string) {
  const trimmed = query.trim()

  return useQuery<UserSummary[], ApiError>({
    queryKey: chatKeys.contacts(trimmed),
    queryFn: () =>
      api.get<UserSummary[]>(
        `/chats/contacts?${new URLSearchParams({ q: trimmed })}`,
      ),
    enabled: trimmed.length >= 2,
    placeholderData: keepPreviousData,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useSendMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation<ChatMessage, ApiError, string>({
    mutationFn: (content) =>
      api.post<ChatMessage>(`/chats/${chatId}/messages`, { content }),
    onSuccess: (message) => {
      queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
        chatKeys.messages(chatId),
        (data) => appendMessage(data, message),
      )
      void queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, 'list'],
      })
    },
  })
}

export function useEditMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    ChatMessage,
    ApiError,
    { messageId: string; content: string }
  >({
    mutationFn: ({ messageId, content }) =>
      api.patch<ChatMessage>(`/chats/${chatId}/messages/${messageId}`, {
        content,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
        chatKeys.messages(chatId),
        (data) => replaceMessage(data, updated),
      )
      void queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, 'list'],
      })
    },
  })
}

export function useDeleteMessage(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationFn: (messageId) =>
      api.delete<void>(`/chats/${chatId}/messages/${messageId}`),
    onSuccess: (_, messageId) => {
      const deletedAt = new Date().toISOString()
      queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
        chatKeys.messages(chatId),
        (data) => markMessageDeleted(data, messageId, deletedAt),
      )
      void queryClient.invalidateQueries({
        queryKey: [...chatKeys.all, 'list'],
      })
    },
  })
}

export function useMarkChatRead(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post<void>(`/chats/${chatId}/read`),
    onSuccess: () => {
      queryClient.setQueriesData<ChatSummary[]>(
        { queryKey: [...chatKeys.all, 'list'] },
        (chats) =>
          chats?.map((chat) =>
            chat.id === chatId ? { ...chat, unread_count: 0 } : chat,
          ),
      )
      queryClient.setQueryData<ChatSummary>(chatKeys.detail(chatId), (chat) =>
        chat ? { ...chat, unread_count: 0 } : chat,
      )
    },
  })
}

export function useOpenDirectChat() {
  const queryClient = useQueryClient()

  return useMutation<ChatSummary, ApiError, string>({
    mutationFn: (userId) =>
      api.post<ChatSummary>('/chats/direct', { user_id: userId }),
    onSuccess: (chat) => rememberChat(queryClient, chat),
  })
}

export function useOpenTreasurerChat() {
  const queryClient = useQueryClient()

  return useMutation<ChatSummary, ApiError, string>({
    mutationFn: (treasurerId) =>
      api.post<ChatSummary>(`/admin/treasurers/${treasurerId}/chat`),
    onSuccess: (chat) => rememberChat(queryClient, chat),
  })
}

export function useOpenAdminChat() {
  const queryClient = useQueryClient()

  return useMutation<ChatSummary, ApiError, void>({
    mutationFn: () => api.post<ChatSummary>('/chats/admin'),
    onSuccess: (chat) => rememberChat(queryClient, chat),
  })
}

// ---------------------------------------------------------------------------
// WebSocket live updates (#128)
// ---------------------------------------------------------------------------

type ChatWsEvent =
  | { type: 'message.created'; chat_id: string; message: ChatMessage }
  | { type: 'message.updated'; chat_id: string; message: ChatMessage }
  | {
      type: 'message.deleted'
      chat_id: string
      message_id: string
      deleted_at: string
    }
  | {
      type: 'chat.read'
      chat_id: string
      user_id: string
      last_read_at: string
    }

export function useChatWebSocket(
  activeChatId: string | undefined,
  myId: string,
) {
  const queryClient = useQueryClient()
  const activeChatRef = useRef(activeChatId)

  useEffect(() => {
    activeChatRef.current = activeChatId
  }, [activeChatId])

  useEffect(() => {
    const token = tokenStorage.getAccess()
    if (!token) return

    let closed = false
    let socket: WebSocket | null = null
    let pingTimer: number | undefined
    let reconnectTimer: number | undefined

    const connect = () => {
      if (closed) return
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/chats/ws?token=${encodeURIComponent(token)}`
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        pingTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send('ping')
          }
        }, 25_000)
      }

      socket.onmessage = (event) => {
        if (event.data === 'pong') return
        let payload: ChatWsEvent
        try {
          payload = JSON.parse(event.data as string) as ChatWsEvent
        } catch {
          return
        }

        if (payload.type === 'message.created') {
          queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
            chatKeys.messages(payload.chat_id),
            (data) => appendMessage(data, payload.message),
          )
          void queryClient.invalidateQueries({
            queryKey: [...chatKeys.all, 'list'],
          })
          if (
            payload.chat_id === activeChatRef.current &&
            payload.message.sender?.id !== myId
          ) {
            void api.post(`/chats/${payload.chat_id}/read`).catch(() => {})
          }
        } else if (payload.type === 'message.updated') {
          queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
            chatKeys.messages(payload.chat_id),
            (data) => replaceMessage(data, payload.message),
          )
          void queryClient.invalidateQueries({
            queryKey: [...chatKeys.all, 'list'],
          })
        } else if (payload.type === 'message.deleted') {
          queryClient.setQueryData<InfiniteData<MessagePage, string | null>>(
            chatKeys.messages(payload.chat_id),
            (data) =>
              markMessageDeleted(data, payload.message_id, payload.deleted_at),
          )
          void queryClient.invalidateQueries({
            queryKey: [...chatKeys.all, 'list'],
          })
        } else if (payload.type === 'chat.read') {
          const updateParticipants = (chat: ChatSummary): ChatSummary => ({
            ...chat,
            participants: chat.participants.map((p) =>
              p.user.id === payload.user_id
                ? { ...p, last_read_at: payload.last_read_at }
                : p,
            ),
          })

          queryClient.setQueryData<ChatSummary>(
            chatKeys.detail(payload.chat_id),
            (chat) => (chat ? updateParticipants(chat) : chat),
          )
          queryClient.setQueriesData<ChatSummary[]>(
            { queryKey: [...chatKeys.all, 'list'] },
            (chats) =>
              chats?.map((chat) =>
                chat.id === payload.chat_id ? updateParticipants(chat) : chat,
              ),
          )
        }
      }

      socket.onclose = () => {
        if (pingTimer) window.clearInterval(pingTimer)
        if (!closed) {
          reconnectTimer = window.setTimeout(connect, 3_000)
        }
      }
    }

    connect()

    return () => {
      closed = true
      if (pingTimer) window.clearInterval(pingTimer)
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [myId, queryClient])
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rememberChat(
  queryClient: ReturnType<typeof useQueryClient>,
  chat: ChatSummary,
) {
  queryClient.setQueryData(chatKeys.detail(chat.id), chat)
  void queryClient.invalidateQueries({ queryKey: [...chatKeys.all, 'list'] })
}

function appendMessage(
  data: InfiniteData<MessagePage, string | null> | undefined,
  message: ChatMessage,
): InfiniteData<MessagePage, string | null> | undefined {
  if (!data) return data
  const [newest, ...older] = data.pages
  if (newest.messages.some((existing) => existing.id === message.id)) {
    return data
  }
  return {
    ...data,
    pages: [{ ...newest, messages: [...newest.messages, message] }, ...older],
  }
}

function replaceMessage(
  data: InfiniteData<MessagePage, string | null> | undefined,
  updated: ChatMessage,
): InfiniteData<MessagePage, string | null> | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: page.messages.map((msg) =>
        msg.id === updated.id ? updated : msg,
      ),
    })),
  }
}

function markMessageDeleted(
  data: InfiniteData<MessagePage, string | null> | undefined,
  messageId: string,
  deletedAt: string,
): InfiniteData<MessagePage, string | null> | undefined {
  if (!data) return data
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: page.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: '', deleted_at: deletedAt }
          : msg,
      ),
    })),
  }
}

export function isChatNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

export function canMessageAdmin(classes: ClassListItem[] | undefined): boolean {
  return classes?.some((item) => item.my_role === 'TREASURER') ?? false
}

export function chatTabs(isTreasurer: boolean): ChatTab[] {
  return isTreasurer
    ? ['ALL', 'CLASS', 'DIRECT', 'ADMIN']
    : ['ALL', 'CLASS', 'DIRECT']
}

export function filterChatsByTab(
  chats: ChatSummary[],
  tab: ChatTab,
): ChatSummary[] {
  if (tab === 'ALL') return chats
  return chats.filter((chat) => chat.kind === tab)
}

export function totalUnread(chats: ChatSummary[] | undefined): number {
  return chats?.reduce((sum, chat) => sum + chat.unread_count, 0) ?? 0
}

export function messagePreview(chat: ChatSummary, myId: string): string {
  const message = chat.last_message
  if (!message) return 'No messages yet'
  if (message.deleted_at) return 'Message deleted'
  if (message.is_system) return message.content
  if (message.sender?.id === myId) return `You: ${message.content}`
  if (chat.kind !== 'DIRECT' && message.sender) {
    return `${message.sender.first_name}: ${message.content}`
  }
  return message.content
}

export function treasurerLabel(chat: ChatSummary): string | null {
  if (!chat.treasurer_classes) return null
  const label = chat.treasurer_classes.length
    ? `Treasurer of ${chat.treasurer_classes.join(', ')}`
    : 'No longer a treasurer'
  return chat.other_user_blocked ? `${label} · blocked` : label
}
