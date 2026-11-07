import { useState } from 'react'
import { Box, Stack, useMediaQuery, useTheme } from '@mui/material'
import { useNavigate, useParams } from 'react-router'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import { useCurrentUser } from '@/features/auth/api'
import type { UserSummary } from '@/features/classes/api'
import { useClasses } from '@/features/classes/api'
import {
  canMessageAdmin,
  useChats,
  useOpenAdminChat,
  useOpenDirectChat,
} from '@/features/chat/api'
import { ChatList } from '@/features/chat/components/ChatList'
import { Conversation } from '@/features/chat/components/Conversation'
import { NewMessageDialog } from '@/features/chat/components/NewMessageDialog'

/**
 * /chat            the list (wide screens: with an empty right column)
 * /chat/:chatId    the list and the open conversation; narrow screens show only
 *                  the conversation, with a back button
 */
export function ChatPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const navigate = useNavigate()
  const theme = useTheme()
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'))

  const { data: me } = useCurrentUser()
  const chats = useChats()
  const { data: classes } = useClasses()
  const isTreasurer = canMessageAdmin(classes)

  const openDirect = useOpenDirectChat()
  const openAdmin = useOpenAdminChat()
  const [isNewMessageOpen, setIsNewMessageOpen] = useState(false)

  if (!me) return null

  const openChat = (id: string) => navigate(`/chat/${id}`)

  const handleSelectContact = (user: UserSummary) => {
    openDirect.mutate(user.id, {
      onSuccess: (chat) => {
        setIsNewMessageOpen(false)
        openChat(chat.id)
      },
    })
  }

  const handleCloseNewMessage = () => {
    setIsNewMessageOpen(false)
    openDirect.reset()
  }

  const showList = !isNarrow || !chatId
  const showConversation = !isNarrow || Boolean(chatId)

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      {showList && (
        <PageHeader
          title="Chat"
          subtitle="Chat with other parents about current and future fundraisers"
        />
      )}

      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          // the page itself does not scroll: the list and the messages do
          height: showList ? 'calc(100dvh - 130px)' : 'calc(100dvh - 2em)',
          minHeight: 480,
        }}
      >
        {showList && (
          <Box sx={{ flex: isNarrow ? 1 : '0 0 360px', minWidth: 0 }}>
            <ChatList
              chats={chats.data ?? []}
              isPending={chats.isPending}
              isError={chats.isError}
              myId={me.id}
              selectedId={chatId}
              isTreasurer={isTreasurer}
              onOpen={openChat}
              onNewMessage={() => setIsNewMessageOpen(true)}
              onMessageAdmin={() =>
                openAdmin.mutate(undefined, {
                  onSuccess: (chat) => openChat(chat.id),
                })
              }
              messageAdminPending={openAdmin.isPending}
            />
          </Box>
        )}

        {showConversation && (
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {chatId ? (
              <Conversation
                // a fresh message list (and scroll position) for every chat
                key={chatId}
                chatId={chatId}
                myId={me.id}
                onBack={isNarrow ? () => navigate('/chat') : undefined}
              />
            ) : (
              <EmptyState
                dashed
                title="Pick a conversation"
                description="Choose a class or a parent on the left, or start a new message."
              />
            )}
          </Box>
        )}
      </Box>

      <NewMessageDialog
        open={isNewMessageOpen}
        onClose={handleCloseNewMessage}
        onSelect={handleSelectContact}
        openingUserId={
          openDirect.isPending ? (openDirect.variables ?? null) : null
        }
        error={
          openDirect.isError
            ? 'Could not open the conversation. Try again.'
            : null
        }
      />
    </Stack>
  )
}
