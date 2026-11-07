import { Box, IconButton, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

import StatusBadge from '@/components/StatusBadge'
import type { ChatKind, ChatSummary } from '@/features/chat/api'
import { ChatAvatar } from '@/features/chat/components/ChatAvatar'

const KINDS: Record<
  ChatKind,
  { label: string; tone: 'success' | 'neutral' | 'warning'; subtitle: string }
> = {
  CLASS: {
    label: 'Class',
    tone: 'success',
    subtitle: 'The treasurer and parents of the class',
  },
  DIRECT: { label: 'Direct', tone: 'neutral', subtitle: 'Direct message' },
  ADMIN: { label: 'Admin', tone: 'warning', subtitle: 'SchoolMoney support' },
}

interface ConversationHeaderProps {
  chat: ChatSummary
  /** Narrow screens: back to the list */
  onBack?: () => void
}

export function ConversationHeader({ chat, onBack }: ConversationHeaderProps) {
  const kind = KINDS[chat.kind]

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: { xs: 1.5, sm: 2.5 },
        py: 1.75,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {onBack && (
        <IconButton onClick={onBack} aria-label="Back to conversations">
          <ArrowBackRoundedIcon />
        </IconButton>
      )}
      <ChatAvatar chat={chat} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h2" noWrap sx={{ fontSize: 20 }}>
          {chat.title}
        </Typography>
        <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
          {kind.subtitle}
        </Typography>
      </Box>
      <StatusBadge tone={kind.tone}>{kind.label}</StatusBadge>
    </Box>
  )
}
