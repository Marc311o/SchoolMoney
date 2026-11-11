import { Fragment, useLayoutEffect, useRef } from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

import type { ChatKind, ChatMessage } from '@/features/chat/api'
import { MessageBubble } from '@/features/chat/components/MessageBubble'
import { dayLabel, isSameDay } from '@/lib/dates'

/** How close to an edge (px) counts as "at the top / at the bottom" */
const EDGE = 80

interface MessageListProps {
  messages: ChatMessage[]
  myId: string
  kind: ChatKind
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
}

/**
 * Starts at the newest message. Scrolling to the top loads older messages
 * without jumping; new messages scroll into view only if you are already at
 * the bottom (or you sent them), so reading history is not interrupted.
 */
export function MessageList({
  messages,
  myId,
  kind,
  hasOlder,
  loadingOlder,
  onLoadOlder,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const heightBeforeOlder = useRef<number | null>(null)

  const firstId = messages[0]?.id
  const last = messages.at(-1)

  // older messages were added on top: keep the same messages in view
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !firstId || heightBeforeOlder.current === null) return
    element.scrollTop += element.scrollHeight - heightBeforeOlder.current
    heightBeforeOlder.current = null
  }, [firstId])

  // a new message at the bottom
  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !last) return
    if (atBottom.current || last.sender.id === myId) {
      element.scrollTop = element.scrollHeight
    }
  }, [last, myId])

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    atBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < EDGE
    if (element.scrollTop < EDGE && hasOlder && !loadingOlder) {
      heightBeforeOlder.current = element.scrollHeight
      onLoadOlder()
    }
  }

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        p: { xs: 1.5, sm: 2.5 },
        bgcolor: 'background.default',
      }}
    >
      {loadingOlder && (
        <CircularProgress size={20} sx={{ alignSelf: 'center' }} />
      )}

      {messages.length === 0 && (
        <Typography sx={{ m: 'auto', fontSize: 14, color: 'text.secondary' }}>
          No messages yet. Say hello!
        </Typography>
      )}

      {messages.map((message, index) => {
        const previous = messages[index - 1]
        const newDay =
          !previous || !isSameDay(previous.created_at, message.created_at)
        const newSender = newDay || previous.sender.id !== message.sender.id

        return (
          <Fragment key={message.id}>
            {newDay && <DayDivider label={dayLabel(message.created_at)} />}
            <MessageBubble
              message={message}
              mine={message.sender.id === myId}
              showName={kind !== 'DIRECT' && newSender}
            />
          </Fragment>
        )
      })}
    </Box>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <Typography
      sx={{
        alignSelf: 'center',
        px: 1.25,
        py: 0.25,
        borderRadius: 999,
        bgcolor: 'divider',
        color: 'text.secondary',
        fontSize: 12,
      }}
    >
      {label}
    </Typography>
  )
}
