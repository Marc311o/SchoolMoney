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

export type ChatKind = 'CLASS' | 'DIRECT' | 'ADMIN'

export type ChatMessage = {
  id: string
  chat_id: string
  sender: UserSummary
  content: string
  created_at: string
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
  last_message: ChatMessage | null
  unread_count: number
  last_activity_at: string
}

/** Tabs above the list. ADMIN is shown to treasurers only. */
export type ChatTab = 'ALL' | ChatKind

/** How often to ask for news while the page is open (no WebSockets yet) */
const LIST_POLL_MS = 10_000
const MESSAGES_POLL_MS = 3_000
const PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const chatKeys = {
  all: ['chat'] as const,
  list: () => [...chatKeys.all, 'list'] as const,
  detail: (id: string) => [...chatKeys.all, 'detail', id] as const,
  messages: (id: string) => [...chatKeys.all, 'messages', id] as const,
  contacts: (query: string) => [...chatKeys.all, 'contacts', query] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * All my conversations, newest activity first. Tabs and search filter this list
 * on the client (`filterChats`): one request, instant tab switching, and the
 * sidebar badge (`totalUnread`) reads the same cache.
 */
export function useChats() {
  return useQuery<ChatSummary[], ApiError>({
    queryKey: chatKeys.list(),
    queryFn: () => api.get<ChatSummary[]>('/chats'),
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
        .getQueryData<ChatSummary[]>(chatKeys.list())
        ?.find((chat) => chat.id === id),
    // 404 = no such chat or no access: asking again will not change that
    retry: (failureCount, error) => !isChatNotFound(error) && failureCount < 1,
  })
}

/**
 * Messages of one conversation, oldest first, ready to render top to bottom.
 * `fetchNextPage()` loads OLDER messages (call it when the user scrolls to the top);
 * `hasNextPage` says whether there are any.
 *
 * Polling refetches the loaded pages from the newest one, so new messages show up
 * at the bottom and the older pages shift without gaps.
 */
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
    // pages[0] is the newest page; the next page is the one before its first message
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

/** The new message appears at the bottom at once, without waiting for polling. */
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
      void queryClient.invalidateQueries({ queryKey: chatKeys.list() })
    },
  })
}

/** Call when a conversation is opened and when new messages arrive in it. */
export function useMarkChatRead(chatId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post<void>(`/chats/${chatId}/read`),
    onSuccess: () => {
      queryClient.setQueryData<ChatSummary[]>(chatKeys.list(), (chats) =>
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

/**
 * Opens the direct chat with a parent: the existing one, or a new one.
 * Navigate to the returned chat's id.
 */
export function useOpenDirectChat() {
  const queryClient = useQueryClient()

  return useMutation<ChatSummary, ApiError, string>({
    mutationFn: (userId) =>
      api.post<ChatSummary>('/chats/direct', { user_id: userId }),
    onSuccess: (chat) => rememberChat(queryClient, chat),
  })
}

/** Opens my chat with the administrator. Treasurers only (others get 403). */
export function useOpenAdminChat() {
  const queryClient = useQueryClient()

  return useMutation<ChatSummary, ApiError, void>({
    mutationFn: () => api.post<ChatSummary>('/chats/admin'),
    onSuccess: (chat) => rememberChat(queryClient, chat),
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rememberChat(
  queryClient: ReturnType<typeof useQueryClient>,
  chat: ChatSummary,
) {
  queryClient.setQueryData(chatKeys.detail(chat.id), chat)
  void queryClient.invalidateQueries({ queryKey: chatKeys.list() })
}

/** Adds my message to the newest page, unless polling already brought it. */
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

export function isChatNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/** The Admin tab and "Message the administrator" are for treasurers only */
export function canMessageAdmin(classes: ClassListItem[] | undefined): boolean {
  return classes?.some((item) => item.my_role === 'TREASURER') ?? false
}

export function chatTabs(isTreasurer: boolean): ChatTab[] {
  return isTreasurer
    ? ['ALL', 'CLASS', 'DIRECT', 'ADMIN']
    : ['ALL', 'CLASS', 'DIRECT']
}

/** What the tabs and the search box show */
export function filterChats(
  chats: ChatSummary[],
  tab: ChatTab,
  query: string,
): ChatSummary[] {
  const needle = query.trim().toLocaleLowerCase()
  return chats.filter(
    (chat) =>
      (tab === 'ALL' || chat.kind === tab) &&
      chat.title.toLocaleLowerCase().includes(needle),
  )
}

/** For the badge next to "Chat" in the sidebar */
export function totalUnread(chats: ChatSummary[] | undefined): number {
  return chats?.reduce((sum, chat) => sum + chat.unread_count, 0) ?? 0
}

/**
 * The preview line under the title: "You: …" for my messages, the sender's
 * first name in class chats ("Marek: …"), just the text otherwise.
 */
export function messagePreview(chat: ChatSummary, myId: string): string {
  const message = chat.last_message
  if (!message) return 'No messages yet'
  if (message.sender.id === myId) return `You: ${message.content}`
  if (chat.kind === 'CLASS') {
    return `${message.sender.first_name}: ${message.content}`
  }
  return message.content
}
