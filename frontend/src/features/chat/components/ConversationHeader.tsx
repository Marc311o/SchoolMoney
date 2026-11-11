import { Box, ButtonBase, IconButton, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import { Link as RouterLink } from 'react-router'

import StatusBadge from '@/components/StatusBadge'
import {
  type ChatKind,
  type ChatSummary,
  treasurerLabel,
} from '@/features/chat/api'
import { ChatAvatar } from '@/features/chat/components/ChatAvatar'

const KINDS: Record<
  ChatKind,
  { label: string; tone: 'success' | 'neutral' | 'warning' }
> = {
  CLASS: { label: 'Class', tone: 'success' },
  DIRECT: { label: 'Direct', tone: 'neutral' },
  ADMIN: { label: 'Admin', tone: 'warning' },
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/** "24 children · 19 parents", "Direct message", "SchoolMoney support" */
function subtitle(chat: ChatSummary): string {
  switch (chat.kind) {
    case 'CLASS':
      return [
        count(chat.children_count ?? 0, 'child', 'children'),
        count(chat.parents_count ?? 0, 'parent', 'parents'),
      ].join(' · ')
    case 'DIRECT':
      return 'Direct message'
    case 'ADMIN':
      // the treasurer sees "Administrator", the administrator sees the treasurer
      return treasurerLabel(chat) ?? 'SchoolMoney support'
  }
}

interface ConversationHeaderProps {
  chat: ChatSummary
  /** Narrow screens: back to the list */
  onBack?: () => void
}

/** A class chat's header is a link to the class page */
export function ConversationHeader({ chat, onBack }: ConversationHeaderProps) {
  const kind = chat.treasurer_classes
    ? { label: 'Treasurer', tone: 'neutral' as const }
    : KINDS[chat.kind]
  const classLink = chat.class_id ? `/classes/${chat.class_id}` : null

  const identity = (
    <>
      <ChatAvatar chat={chat} />
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Typography variant="h2" noWrap sx={{ fontSize: 20 }}>
            {chat.title}
          </Typography>
          {classLink && (
            <ChevronRightRoundedIcon
              aria-hidden
              sx={{ color: 'text.secondary', flex: 'none' }}
            />
          )}
        </Box>
        <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
          {subtitle(chat)}
        </Typography>
      </Box>
    </>
  )

  const identitySx = {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
  }

  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: { xs: 1, sm: 1.5 },
        py: 1,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      {onBack && (
        <IconButton onClick={onBack} aria-label="Back to conversations">
          <ArrowBackRoundedIcon />
        </IconButton>
      )}

      {classLink ? (
        <ButtonBase
          component={RouterLink}
          to={classLink}
          aria-label={`Open ${chat.title}`}
          sx={{
            ...identitySx,
            p: 1,
            borderRadius: '10px',
            justifyContent: 'flex-start',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {identity}
        </ButtonBase>
      ) : (
        <Box sx={{ ...identitySx, p: 1 }}>{identity}</Box>
      )}

      {/* narrow screens: the title needs the room */}
      {!onBack && (
        <Box sx={{ pr: 1 }}>
          <StatusBadge tone={kind.tone}>{kind.label}</StatusBadge>
        </Box>
      )}
    </Box>
  )
}
