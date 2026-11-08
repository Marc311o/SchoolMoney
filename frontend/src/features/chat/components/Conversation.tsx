import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { CircularProgress, Stack, Typography } from '@mui/material'

import AppButtonOutlined from '@/components/AppButtonOutlined'
import WhiteCard from '@/components/WhiteCard'
import {
  isChatNotFound,
  useChat,
  useChatMessages,
  useMarkChatRead,
  useSendMessage,
} from '@/features/chat/api'
import { ConversationHeader } from '@/features/chat/components/ConversationHeader'
import { MessageComposer } from '@/features/chat/components/MessageComposer'
import { MessageList } from '@/features/chat/components/MessageList'

interface ConversationProps {
  chatId: string
  myId: string
  /** Narrow screens: back to the list */
  onBack?: () => void
}

/** Right column: header, messages and the composer of one conversation */
export function Conversation({ chatId, myId, onBack }: ConversationProps) {
  const chat = useChat(chatId)
  const messages = useChatMessages(chatId)
  const sendMessage = useSendMessage(chatId)
  const { mutate: markRead } = useMarkChatRead(chatId)

  const last = messages.data?.at(-1)

  // reading the conversation clears its unread badge: on open and on each new message
  useEffect(() => {
    if (last && last.sender.id !== myId) markRead()
  }, [last, myId, markRead])

  if (isChatNotFound(chat.error) || isChatNotFound(messages.error)) {
    return (
      <Panel>
        <Stack spacing={2} sx={{ m: 'auto', p: 3, alignItems: 'center' }}>
          <Typography sx={{ color: 'text.secondary', textAlign: 'center' }}>
            This conversation does not exist or you no longer have access to it.
          </Typography>
          {onBack && (
            <AppButtonOutlined label="Back to conversations" onClick={onBack} />
          )}
        </Stack>
      </Panel>
    )
  }

  if (!chat.data || !messages.data) {
    return (
      <Panel>
        <CircularProgress sx={{ m: 'auto' }} />
      </Panel>
    )
  }

  return (
    <Panel>
      <ConversationHeader chat={chat.data} onBack={onBack} />
      <MessageList
        messages={messages.data}
        myId={myId}
        kind={chat.data.kind}
        hasOlder={messages.hasNextPage}
        loadingOlder={messages.isFetchingNextPage}
        onLoadOlder={() => void messages.fetchNextPage()}
      />
      <MessageComposer
        onSend={(content) => sendMessage.mutateAsync(content)}
        sending={sendMessage.isPending}
        error={
          sendMessage.isError ? 'Could not send the message. Try again.' : null
        }
      />
    </Panel>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <WhiteCard
      padding={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {children}
    </WhiteCard>
  )
}
