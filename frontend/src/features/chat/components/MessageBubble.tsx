import { useEffect, useRef, useState } from 'react'
import {
  Box,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'

import AppAvatar from '@/components/AppAvatar'
import { type ChatMessage, EDIT_DELETE_WINDOW_MS } from '@/features/chat/api'
import { formatTime } from '@/lib/dates'
import { fullName, initials } from '@/lib/names'

interface MessageBubbleProps {
  message: ChatMessage
  mine: boolean
  /** Class chats: the sender's name above the first of their messages in a row */
  showName: boolean
  canModerate: boolean
  onEdit: (messageId: string, content: string) => Promise<unknown>
  onDelete: (messageId: string) => Promise<unknown>
}

export function MessageBubble({
  message,
  mine,
  showName,
  canModerate,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus()
    }
  }, [isEditing])

  // #202 System notifications
  if (message.is_system) {
    return (
      <Typography
        sx={{
          alignSelf: 'center',
          px: 1.5,
          py: 0.4,
          borderRadius: 999,
          bgcolor: 'action.hover',
          color: 'text.secondary',
          fontSize: 12.5,
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: '85%',
        }}
      >
        {message.content}
      </Typography>
    )
  }

  const isDeleted = Boolean(message.deleted_at)
  const withinWindow =
    now - Date.parse(message.created_at) <= EDIT_DELETE_WINDOW_MS
  const canEdit = mine && !isDeleted && withinWindow
  const canDelete = !isDeleted && ((mine && withinWindow) || canModerate)

  const handleSaveEdit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false)
      return
    }
    setBusy(true)
    try {
      await onEdit(message.id, trimmed)
      setIsEditing(false)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true)
    try {
      await onDelete(message.id)
    } finally {
      setBusy(false)
    }
  }

  const time = (
    <Typography
      component="time"
      dateTime={message.created_at}
      sx={{ fontSize: 12, color: 'text.secondary' }}
    >
      {formatTime(message.created_at)}
      {message.edited_at && !isDeleted ? ' · edited' : ''}
    </Typography>
  )

  const actions =
    !isEditing && (canEdit || canDelete) ? (
      <Stack
        direction="row"
        spacing={0.25}
        className="msg-actions"
        sx={{ opacity: 0, transition: 'opacity 120ms' }}
      >
        {canEdit && (
          <Tooltip title="Edit message">
            <IconButton
              size="small"
              disabled={busy}
              onClick={() => {
                setDraft(message.content)
                setIsEditing(true)
              }}
            >
              <EditRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
        {canDelete && (
          <Tooltip title="Delete message">
            <IconButton size="small" disabled={busy} onClick={handleDelete}>
              <DeleteOutlineRoundedIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    ) : null

  const bubbleContent = isEditing ? (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        p: 0.75,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'primary.main',
        alignItems: 'center',
      }}
    >
      <TextField
        inputRef={editInputRef}
        size="small"
        multiline
        maxRows={4}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            void handleSaveEdit()
          } else if (e.key === 'Escape') {
            setIsEditing(false)
          }
        }}
        sx={{ minWidth: 200 }}
      />
      <IconButton
        size="small"
        color="primary"
        disabled={busy || !draft.trim()}
        onClick={() => void handleSaveEdit()}
      >
        <CheckRoundedIcon fontSize="small" />
      </IconButton>
      <IconButton
        size="small"
        disabled={busy}
        onClick={() => setIsEditing(false)}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Stack>
  ) : (
    <Bubble mine={mine} deleted={isDeleted}>
      {isDeleted ? 'This message was deleted' : message.content}
    </Bubble>
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
          '&:hover .msg-actions': { opacity: 1 },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {actions}
          {bubbleContent}
        </Box>
        {time}
      </Box>
    )
  }

  const name = message.sender ? fullName(message.sender) : 'Deleted user'

  return (
    <Box
      sx={{
        alignSelf: 'flex-start',
        maxWidth: '72%',
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        '&:hover .msg-actions': { opacity: 1 },
      }}
    >
      <AppAvatar
        name={name}
        src={message.sender?.avatar_url ?? null}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {bubbleContent}
          {actions}
        </Box>
        {time}
      </Box>
    </Box>
  )
}

function Bubble({
  mine = false,
  deleted = false,
  children,
}: {
  mine?: boolean
  deleted?: boolean
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
        ...(deleted
          ? {
              borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              bgcolor: 'action.hover',
              color: 'text.secondary',
              fontStyle: 'italic',
              border: 1,
              borderColor: 'divider',
            }
          : mine
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
