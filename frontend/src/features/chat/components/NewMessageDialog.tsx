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
import { fullName, initials } from '@/lib/names'

const DEBOUNCE_MS = 300

export interface ContactResults<T extends UserSummary> {
  data: T[] | undefined
  isPending: boolean
  isError: boolean
}

interface NewMessageDialogProps<T extends UserSummary> {
  open: boolean
  title: string
  description: string
  noun: string
  minChars: number
  onSearch: (query: string) => void
  results: ContactResults<T>
  describe?: (user: T) => string
  onClose: () => void
  onSelect: (user: T) => void
  openingUserId: string | null
  error: string | null
}

/** Pick a person to write to; the page decides who can be found */
export function NewMessageDialog<T extends UserSummary>({
  open,
  title,
  description,
  noun,
  minChars,
  onSearch,
  results,
  describe,
  onClose,
  onSelect,
  openingUserId,
  error,
}: NewMessageDialogProps<T>) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => onSearch(query), [query, onSearch])

  const tooShort = query.trim().length < minChars
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
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>

      <DialogContent>
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {description}
          </Typography>
          <TextInput
            value={search}
            onChange={setSearch}
            placeholder="First or last name"
            ariaLabel={`Search ${noun}`}
            icon={<SearchRoundedIcon fontSize="small" />}
          />

          <Box sx={{ minHeight: 160 }}>
            {tooShort ? (
              <Hint>Type at least {minChars} letters.</Hint>
            ) : results.isError ? (
              <Hint>Could not search right now. Try again.</Hint>
            ) : results.isPending || !results.data ? (
              <CircularProgress
                size={24}
                sx={{ display: 'block', mx: 'auto', mt: 3 }}
              />
            ) : results.data.length === 0 ? (
              <Hint>
                {query.trim()
                  ? `No ${noun} match “${query.trim()}”.`
                  : `No ${noun} yet.`}
              </Hint>
            ) : (
              <Stack spacing={0.25}>
                {results.data.map((user) => (
                  <ContactRow
                    key={user.id}
                    user={user}
                    detail={describe?.(user)}
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
  detail,
  opening,
  disabled,
  onClick,
}: {
  user: UserSummary
  detail: string | undefined
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
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontWeight: 600, fontSize: 15 }}>
          {name}
        </Typography>
        {detail && (
          <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
            {detail}
          </Typography>
        )}
      </Box>
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
