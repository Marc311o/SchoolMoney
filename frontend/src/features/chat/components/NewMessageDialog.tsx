import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Box,
  ButtonBase,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'

import AppAvatar from '@/components/AppAvatar'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'
import type { UserSummary } from '@/features/classes/api'
import { useChatContacts } from '@/features/chat/api'
import { fullName, initials } from '@/lib/names'

/** Wait for a pause in typing before asking the API */
const DEBOUNCE_MS = 300

interface NewMessageDialogProps {
  open: boolean
  onClose: () => void
  onSelect: (user: UserSummary) => void
  /** The person whose chat is being opened right now */
  openingUserId: string | null
  error: string | null
}

export function NewMessageDialog({
  open,
  onClose,
  onSelect,
  openingUserId,
  error,
}: NewMessageDialogProps) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const contacts = useChatContacts(query)
  const tooShort = query.trim().length < 2
  const busy = openingUserId !== null

  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        transition: {
          onExited: () => {
            setSearch('')
            setQuery('')
          },
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>New message</DialogTitle>

      <DialogContent>
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Write to any parent in SchoolMoney. Find them by name.
          </Typography>
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder="First or last name"
            ariaLabel="Search parents"
            icon={<SearchRoundedIcon fontSize="small" />}
          />

          <Box sx={{ minHeight: 160 }}>
            {tooShort ? (
              <Hint>Type at least 2 letters.</Hint>
            ) : contacts.isError ? (
              <Hint>Could not search right now. Try again.</Hint>
            ) : contacts.isPending ? (
              <CircularProgress
                size={24}
                sx={{ display: 'block', mx: 'auto', mt: 3 }}
              />
            ) : contacts.data.length === 0 ? (
              <Hint>No parents match “{query.trim()}”.</Hint>
            ) : (
              <Stack spacing={0.25}>
                {contacts.data.map((user) => (
                  <ContactRow
                    key={user.id}
                    user={user}
                    opening={openingUserId === user.id}
                    disabled={busy}
                    onClick={() => onSelect(user)}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {error && (
            <Typography color="error" sx={{ fontSize: 14 }}>
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <AppButtonOutlined label="Cancel" onClick={onClose} disabled={busy} />
      </DialogActions>
    </Dialog>
  )
}

function ContactRow({
  user,
  opening,
  disabled,
  onClick,
}: {
  user: UserSummary
  opening: boolean
  disabled: boolean
  onClick: () => void
}) {
  const name = fullName(user)

  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 1.5,
        p: 1,
        borderRadius: '10px',
        textAlign: 'left',
        '&:hover': { bgcolor: 'action.hover' },
        '&.Mui-disabled': { opacity: opening ? 1 : 0.5 },
      }}
    >
      <AppAvatar
        name={name}
        src={user.avatar_url}
        label={initials(name)}
        size={36}
      />
      <Typography noWrap sx={{ flex: 1, fontWeight: 600, fontSize: 15 }}>
        {name}
      </Typography>
      {opening && <CircularProgress size={18} />}
    </ButtonBase>
  )
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ mt: 1, fontSize: 14, color: 'text.secondary' }}>
      {children}
    </Typography>
  )
}
