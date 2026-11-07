import { Box, Typography } from '@mui/material'

import AppAvatar from '@/components/AppAvatar'
import type { ChatMessage } from '@/features/chat/api'
import { formatTime } from '@/lib/dates'
import { fullName, initials } from '@/lib/names'

interface MessageBubbleProps {
  message: ChatMessage
  mine: boolean
  /** Class chats: the sender's name above the first of their messages in a row */
  showName: boolean
}

export function MessageBubble({ message, mine, showName }: MessageBubbleProps) {
  const time = (
    <Typography
      component="time"
      dateTime={message.created_at}
      sx={{ fontSize: 12, color: 'text.secondary' }}
    >
      {formatTime(message.created_at)}
    </Typography>
  )

  if (mine) {
    return (
      <Box
        sx={{
          alignSelf: 'flex-end',
          maxWidth: '72%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 0.25,
        }}
      >
        <Bubble mine>{message.content}</Bubble>
        {time}
      </Box>
    )
  }

  const name = fullName(message.sender)

  return (
    <Box
      sx={{
        alignSelf: 'flex-start',
        maxWidth: '72%',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
      }}
    >
      <AppAvatar
        name={name}
        src={message.sender.avatar_url}
        label={initials(name)}
        size={32}
      />
      <Box
        sx={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
        }}
      >
        {showName && (
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{name}</Typography>
        )}
        <Bubble>{message.content}</Bubble>
        {time}
      </Box>
    </Box>
  )
}

function Bubble({
  mine = false,
  children,
}: {
  mine?: boolean
  children: string
}) {
  return (
    <Typography
      sx={{
        px: 1.75,
        py: 1.25,
        fontSize: 15,
        lineHeight: 1.45,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        ...(mine
          ? {
              borderRadius: '14px 14px 4px 14px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }
          : {
              borderRadius: '14px 14px 14px 4px',
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }),
      }}
    >
      {children}
    </Typography>
  )
}
