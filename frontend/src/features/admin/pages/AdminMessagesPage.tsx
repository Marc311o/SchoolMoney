import { useEffect, useRef, useState } from 'react'
import {
  Box,
  CircularProgress,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import { useAdminUsers } from '@/features/admin/api'
import type { AdminUser } from '@/features/admin/api'
import { useCurrentUser } from '@/features/auth/api'
import { useChats, useOpenTreasurerChat } from '@/features/chat/api'
import { ChatList } from '@/features/chat/components/ChatList'
import { Conversation } from '@/features/chat/components/Conversation'
import { NewMessageDialog } from '@/features/chat/components/NewMessageDialog'

const BASE = '/admin/messages'

const TREASURER_RESULTS = 20

function describeTreasurer(user: AdminUser): string {
  return `Treasurer of ${user.classes.map((c) => c.name).join(', ')}`
}

export function AdminMessagesPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const [params] = useSearchParams()
  const treasurerId = params.get('treasurer')
  const navigate = useNavigate()
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))

  const { data: me } = useCurrentUser()
  const chats = useChats()
  const openTreasurer = useOpenTreasurerChat()
  const { mutate: openTreasurerChat } = openTreasurer

  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)
  const [treasurerQuery, setTreasurerQuery] = useState('')
  const treasurers = useAdminUsers({
    q: treasurerQuery,
    status: 'ACTIVE',
    treasurersOnly: true,
    page: 1,
    pageSize: TREASURER_RESULTS,
  })

  const openChat = (id: string) => navigate(`${BASE}/${id}`)

  const conversations = (chats.data ?? []).filter(
    (chat) => chat.last_message !== null || chat.id === chatId,
  )

  const handled = useRef<string | null>(null)
  useEffect(() => {
    if (!treasurerId || handled.current === treasurerId) return
    handled.current = treasurerId
    openTreasurerChat(treasurerId, {
      onSuccess: (chat) => navigate(`${BASE}/${chat.id}`, { replace: true }),
    })
  }, [treasurerId, openTreasurerChat, navigate])

  if (!me) return null

  const handleSelectTreasurer = (user: AdminUser) => {
    openTreasurer.mutate(user.id, {
      onSuccess: (chat) => {
        setIsNewMessageOpen(false)
        openChat(chat.id)
      },
    })
  }

  const handleCloseNewMessage = () => {
    setIsNewMessageOpen(false)
    openTreasurer.reset()
  }

  const openingFromLink = Boolean(treasurerId)
  const showList = !isNarrow || (!chatId && !openingFromLink)
  const showConversation = !isNarrow || Boolean(chatId) || openingFromLink

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      {showList && (
        <PageHeader
          title="Messages"
          subtitle="Conversations with class treasurers. Every administrator sees all of them."
        />
      )}

      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          height: showList ? 'calc(100dvh - 130px)' : 'calc(100dvh - 2em)',
          minHeight: 480,
        }}
      >
        {showList && (
          <Box sx={{ flex: isNarrow ? 1 : '0 0 360px', minWidth: 0 }}>
            <ChatList
              chats={conversations}
              isPending={chats.isPending}
              isError={chats.isError}
              myId={me.id}
              selectedId={chatId}
              tabs={[]}
              searchPlaceholder="Search treasurers"
              newMessageLabel="Message a treasurer"
              onOpen={openChat}
              onNewMessage={() => setIsNewMessageOpen(true)}
            />
          </Box>
        )}

        {showConversation && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {openingFromLink && openTreasurer.isError ? (
              <EmptyState
                dashed
                title="Could not open this chat"
                description="This person may no longer run a class. Pick a conversation or message another treasurer."
              />
            ) : openingFromLink ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : chatId ? (
              <Conversation
                key={chatId}
                chatId={chatId}
                myId={me.id}
                onBack={isNarrow ? () => navigate(BASE) : undefined}
              />
            ) : (
              <EmptyState
                dashed
                title="Pick a conversation"
                description="Choose a treasurer on the left, or message a treasurer who has not written yet."
              />
            )}
          </Box>
        )}
      </Box>

      <NewMessageDialog
        open={isNewMessageOpen}
        title="Message a treasurer"
        description="Treasurers who run a class. Your message goes to their chat with the administrators."
        noun="treasurers"
        minChars={0}
        onSearch={setTreasurerQuery}
        results={{
          data: treasurers.data?.items,
          isPending: treasurers.isPending,
          isError: treasurers.isError,
        }}
        describe={describeTreasurer}
        onClose={handleCloseNewMessage}
        onSelect={handleSelectTreasurer}
        openingUserId={
          openTreasurer.isPending ? (openTreasurer.variables ?? null) : null
        }
        error={
          openTreasurer.isError && !openingFromLink
            ? 'Could not open the conversation. Try again.'
            : null
        }
      />
    </Stack>
  )
}
