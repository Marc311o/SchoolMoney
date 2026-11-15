import { Fragment, useLayoutEffect, useMemo, useRef } from 'react'
import { Box, CircularProgress, Tooltip, Typography } from '@mui/material'

import AppAvatar from '@/components/AppAvatar'
import type {
  ChatKind,
  ChatMessage,
  ChatParticipant,
} from '@/features/chat/api'
import { MessageBubble } from '@/features/chat/components/MessageBubble'
import { dayLabel, isSameDay } from '@/lib/dates'
import { fullName, initials } from '@/lib/names'

/** How close to an edge (px) counts as "at the top / at the bottom" */
const EDGE = 80

interface MessageListProps {
  messages: ChatMessage[]
  myId: string
  kind: ChatKind
  participants: ChatParticipant[]
  canModerate: boolean
  onEdit: (messageId: string, content: string) => Promise<unknown>
  onDelete: (messageId: string) => Promise<unknown>
  hasOlder: boolean
  loadingOlder: boolean
  onLoadOlder: () => void
}

export function MessageList({
  messages,
  myId,
  kind,
  participants,
  canModerate,
  onEdit,
  onDelete,
  hasOlder,
  loadingOlder,
  onLoadOlder,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  const heightBeforeOlder = useRef<number | null>(null)

  const firstId = messages[0]?.id
  const last = messages.at(-1)

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !firstId || heightBeforeOlder.current === null) return
    element.scrollTop += element.scrollHeight - heightBeforeOlder.current
    heightBeforeOlder.current = null
  }, [firstId])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !last) return
    if (atBottom.current || last.sender?.id === myId) {
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

  // Map messageId -> users whose last_read_at reaches this message as their latest seen
  const seenByMessageId = useMemo(() => {
    const map = new Map<string, ChatParticipant['user'][]>()
    if (messages.length === 0) return map

    for (const participant of participants) {
      if (participant.user.id === myId || !participant.last_read_at) continue
      const readMs = Date.parse(participant.last_read_at)
      if (Number.isNaN(readMs)) continue

      let latestSeenId: string | null = null
      for (const msg of messages) {
        if (Date.parse(msg.created_at) <= readMs) {
          latestSeenId = msg.id
        } else {
          break
        }
      }

      if (latestSeenId) {
        const list = map.get(latestSeenId) ?? []
        list.push(participant.user)
        map.set(latestSeenId, list)
      }
    }

    return map
  }, [messages, participants, myId])

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
        const newSender =
          newDay ||
          previous.is_system ||
          message.is_system ||
          previous.sender?.id !== message.sender?.id
        const seenUsers = seenByMessageId.get(message.id) ?? []

        return (
          <Fragment key={message.id}>
            {newDay && <DayDivider label={dayLabel(message.created_at)} />}
            <MessageBubble
              message={message}
              mine={!message.is_system && message.sender?.id === myId}
              showName={kind !== 'DIRECT' && newSender}
              canModerate={canModerate}
              onEdit={onEdit}
              onDelete={onDelete}
            />
            {seenUsers.length > 0 && <SeenByRow users={seenUsers} />}
          </Fragment>
        )
      })}
    </Box>
  )
}

function SeenByRow({ users }: { users: ChatParticipant['user'][] }) {
  const names = users.map((u) => fullName(u)).join(', ')

  return (
    <Tooltip title={`Seen by ${names}`} placement="left">
      <Box
        sx={{
          alignSelf: 'flex-end',
          display: 'flex',
          alignItems: 'center',
          gap: 0.4,
          mt: -0.5,
        }}
      >
        {users.slice(0, 6).map((user) => {
          const name = fullName(user)
          return (
            <AppAvatar
              key={user.id}
              name={name}
              src={user.avatar_url}
              label={initials(name)}
              size={16}
            />
          )
        })}
        {users.length > 6 && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            +{users.length - 6}
          </Typography>
        )}
      </Box>
    </Tooltip>
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
