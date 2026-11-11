import { Box, ButtonBase, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'

import {
  type ChatSummary,
  messagePreview,
  treasurerLabel,
} from '@/features/chat/api'
import { ChatAvatar } from '@/features/chat/components/ChatAvatar'
import { UnreadBadge } from '@/features/chat/components/UnreadBadge'
import { shortTimestamp } from '@/lib/dates'

interface ChatListItemProps {
  chat: ChatSummary
  myId: string
  selected: boolean
  onClick: () => void
}

export function ChatListItem({
  chat,
  myId,
  selected,
  onClick,
}: ChatListItemProps) {
  const hasUnread = chat.unread_count > 0
  const treasurer = treasurerLabel(chat)

  return (
    <ButtonBase
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.25,
        borderRadius: '10px',
        textAlign: 'left',
        bgcolor: selected
          ? (theme) => alpha(theme.palette.primary.main, 0.12)
          : 'transparent',

        '&:hover': {
          bgcolor: selected
            ? (theme) => alpha(theme.palette.primary.main, 0.16)
            : 'action.hover',
        },
      }}
    >
      <ChatAvatar chat={chat} />

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography noWrap sx={{ fontSize: 15, fontWeight: 600 }}>
            {chat.title}
          </Typography>
          <Typography
            component="span"
            sx={{ flex: 'none', fontSize: 12, color: 'text.secondary' }}
          >
            {shortTimestamp(chat.last_activity_at)}
          </Typography>
        </Box>

        {treasurer && (
          <Typography noWrap sx={{ fontSize: 12, color: 'text.secondary' }}>
            {treasurer}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: 13,
              color: hasUnread ? 'text.primary' : 'text.secondary',
              fontWeight: hasUnread ? 600 : 400,
            }}
          >
            {messagePreview(chat, myId)}
          </Typography>
          <UnreadBadge count={chat.unread_count} />
        </Box>
      </Box>
    </ButtonBase>
  )
}
