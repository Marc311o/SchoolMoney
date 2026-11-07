import { useRef, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  ClickAwayListener,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Popper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'

import AppButton from '@/components/AppButton'
import WhiteCard from '@/components/WhiteCard'
import { fullName } from '@/lib/names'

import { type ParentSearchResult, useSearchParents } from '../api'
import { useSendClassInvite } from '@/features/classes/api'

interface ParentSearchSectionProps {
  classId: string
}

export function ParentSearchSection({ classId }: ParentSearchSectionProps) {
  const [email, setEmail] = useState('')
  const [selectedParent, setSelectedParent] =
    useState<ParentSearchResult | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  const inputRef = useRef<HTMLDivElement>(null)

  const query = email.trim()

  const {
    data: parents,
    isFetching: isSearching,
    isError: isSearchError,
  } = useSearchParents(query)

  const sendInviteMutation = useSendClassInvite(classId)

  const selectParent = (parent: ParentSearchResult) => {
    setSelectedParent(parent)
    setEmail('')
    setListOpen(false)
    setEmailSent(false)
    sendInviteMutation.reset()
  }

  const removeParent = () => {
    setSelectedParent(null)
    setEmail('')
    setListOpen(false)
    setEmailSent(false)
    sendInviteMutation.reset()
  }

  const sendInvite = () => {
    if (!selectedParent || !classId) return

    sendInviteMutation.mutate(
      { parent_id: selectedParent.id },
      {
        onSuccess: () => setEmailSent(true),
      },
    )
  }

  const showResults =
    !selectedParent && listOpen && query.length >= 2 && Boolean(parents?.length)

  return (
    <WhiteCard>
      <Stack spacing={1}>
        <Typography variant="h2">Invite a parent</Typography>

        {!selectedParent && (
          <>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Search for a parent by email to send them an invitation to this
              class.
            </Typography>

            <Box ref={inputRef} sx={{ width: '100%', mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Parent email"
                placeholder="Enter parent's email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setListOpen(true)
                }}
                onFocus={() => setListOpen(true)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  },
                }}
                helperText="Enter at least 2 characters to search."
              />
            </Box>

            <Popper
              open={showResults}
              anchorEl={inputRef.current}
              placement="bottom-start"
              keepMounted
              modifiers={[
                {
                  name: 'offset',
                  options: { offset: [0, 4] },
                },
              ]}
              sx={{
                zIndex: (theme) => theme.zIndex.modal + 1,
                width: inputRef.current?.clientWidth,
              }}
            >
              <ClickAwayListener onClickAway={() => setListOpen(false)}>
                <Paper
                  elevation={6}
                  sx={{
                    maxHeight: 280,
                    overflowY: 'auto',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                  }}
                >
                  {parents?.map((parent, index) => (
                    <Box
                      key={parent.id}
                      component="button"
                      type="button"
                      onClick={() => selectParent(parent)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        p: 1.5,
                        textAlign: 'left',
                        color: 'inherit',
                        bgcolor: 'background.paper',
                        border: 0,
                        borderBottom: index < parents.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        '&:focus-visible': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '-2px',
                        },
                      }}
                    >
                      <Avatar src={parent.avatar_url ?? undefined}>
                        {parent.first_name[0]}
                      </Avatar>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {fullName(parent)}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ overflowWrap: 'anywhere' }}
                        >
                          {parent.email}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Paper>
              </ClickAwayListener>
            </Popper>

            {query.length >= 2 && isSearching && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 1,
                }}
              >
                <CircularProgress size={18} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  Searching parents...
                </Typography>
              </Box>
            )}

            {isSearchError && (
              <Alert severity="error">
                Could not search for parents. Please try again.
              </Alert>
            )}

            {query.length >= 2 &&
              !isSearching &&
              !isSearchError &&
              parents?.length === 0 && (
                <Alert severity="info">No parents found.</Alert>
              )}
          </>
        )}

        {selectedParent && (
          <>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Selected parent
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Avatar src={selectedParent.avatar_url ?? undefined}>
                {selectedParent.first_name[0]}
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {fullName(selectedParent)}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {selectedParent.email}
                </Typography>
              </Box>

              <IconButton
                size="small"
                aria-label="Remove selected parent"
                onClick={removeParent}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {!emailSent ? (
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
                <AppButton
                  label="Send invitation"
                  loading={sendInviteMutation.isPending}
                  disabled={sendInviteMutation.isPending}
                  onClick={sendInvite}
                />
              </Stack>
            ) : (
              <Alert severity="success">
                An invitation email with the class access link has been sent to{' '}
                <strong>{selectedParent.email}</strong>.
              </Alert>
            )}

            {sendInviteMutation.isError && (
              <Alert severity="error">
                Could not send invitation email. Please try again.
              </Alert>
            )}
          </>
        )}
      </Stack>
    </WhiteCard>
  )
}
