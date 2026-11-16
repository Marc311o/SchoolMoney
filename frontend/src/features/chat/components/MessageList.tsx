import { Fragment, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  Fade,
  Tooltip,
  Typography,
} from '@mui/material'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'

import AppAvatar from '@/components/AppAvatar'
import type {
  ChatKind,
  ChatMessage,
  ChatParticipant,
} from '@/features/chat/api'
import { MessageBubble } from '@/features/chat/components/MessageBubble'
import { dayLabel, isSameDay } from '@/lib/dates'
import { fullName, initials } from '@/lib/names'

/** How close to the bottom (px) counts as "at the bottom" */
const BOTTOM_EDGE = 24
/** How close to the top (px) triggers loading older messages */
const TOP_EDGE = 80

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
  const prevLastIdRef = useRef<string | undefined>(undefined)

  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [unseenNewCount, setUnseenNewCount] = useState(0)

  const firstId = messages[0]?.id
  const last = messages.at(-1)
  const lastId = last?.id
  const lastSenderId = last?.sender?.id

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !firstId || heightBeforeOlder.current === null) return
    element.scrollTop += element.scrollHeight - heightBeforeOlder.current
    heightBeforeOlder.current = null
  }, [firstId])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element || !lastId) return

    const isInitialLoad = prevLastIdRef.current === undefined
    const isNewTailMessage = !isInitialLoad && prevLastIdRef.current !== lastId
    prevLastIdRef.current = lastId

    if (isInitialLoad) {
      element.scrollTop = element.scrollHeight
      atBottom.current = true
      setShowScrollBottom(false)
      setUnseenNewCount(0)
      return
    }

    if (!isNewTailMessage) return

    if (atBottom.current || lastSenderId === myId) {
      element.scrollTop = element.scrollHeight
      atBottom.current = true
      setShowScrollBottom(false)
      setUnseenNewCount(0)
    } else {
      setUnseenNewCount((count) => count + 1)
      setShowScrollBottom(true)
    }
  }, [lastId, lastSenderId, myId])

  const scrollToBottom = () => {
    const element = scrollRef.current
    if (!element) return
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
    atBottom.current = true
    setShowScrollBottom(false)
    setUnseenNewCount(0)
  }

  const handleScroll = () => {
    const element = scrollRef.current
    if (!element) return
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      BOTTOM_EDGE
    atBottom.current = isNearBottom

    if (isNearBottom) {
      setShowScrollBottom(false)
      setUnseenNewCount(0)
    } else {
      setShowScrollBottom(true)
    }

    if (element.scrollTop < TOP_EDGE && hasOlder && !loadingOlder) {
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
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      <Box
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowAnchor: 'none',
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

      <Fade in={showScrollBottom}>
        <Button
          size="small"
          variant="contained"
          onClick={scrollToBottom}
          startIcon={<KeyboardArrowDownRoundedIcon fontSize="small" />}
          sx={{
            position: 'absolute',
            bottom: 14,
            right: 20,
            borderRadius: 999,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: 12.5,
            px: 1.75,
            py: 0.6,
            boxShadow: 3,
          }}
        >
          {unseenNewCount > 0
            ? unseenNewCount === 1
              ? '1 new message'
              : `${unseenNewCount} new messages`
            : 'Scroll to bottom'}
        </Button>
      </Fade>
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
