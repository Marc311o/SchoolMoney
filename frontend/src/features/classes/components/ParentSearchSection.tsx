import { useState } from 'react'
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
  existingParentIds: string[]
}

export function ParentSearchSection({
  classId,
  existingParentIds,
}: ParentSearchSectionProps) {
  const [email, setEmail] = useState('')
  const [selectedParents, setSelectedParents] = useState<ParentSearchResult[]>(
    [],
  )
  const [listOpen, setListOpen] = useState(false)
  const [inputElement, setInputElement] = useState<HTMLDivElement | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    sent: number
    failed: number
  } | null>(null)

  const query = email.trim()

  const {
    data: parents,
    isFetching: isSearching,
    isError: isSearchError,
  } = useSearchParents(query)

  const existingParentIdSet = new Set(existingParentIds)
  const selectedParentIdSet = new Set(
    selectedParents.map((parent) => parent.id),
  )

  const availableParents = parents?.filter(
    (parent) =>
      !existingParentIdSet.has(parent.id) &&
      !selectedParentIdSet.has(parent.id),
  )

  const sendInviteMutation = useSendClassInvite(classId)

  const selectParent = (parent: ParentSearchResult) => {
    setSelectedParents((previous) => [...previous, parent])
    setEmail('')
    setListOpen(false)
    setSendResult(null)
  }

  const removeParent = (parentId: string) => {
    setSelectedParents((previous) =>
      previous.filter((parent) => parent.id !== parentId),
    )
    setSendResult(null)
  }

  const sendInvites = async () => {
    if (!selectedParents.length || !classId || isSending) return

    setIsSending(true)
    setSendResult(null)

    const results = await Promise.allSettled(
      selectedParents.map((parent) =>
        sendInviteMutation.mutateAsync({
          parent_id: parent.id,
        }),
      ),
    )

    const sent = results.filter(
      (result) => result.status === 'fulfilled',
    ).length

    const failed = results.length - sent

    setSendResult({ sent, failed })

    if (failed === 0) {
      setSelectedParents([])
    } else {
      setSelectedParents((previous) =>
        previous.filter((_, index) => results[index].status === 'rejected'),
      )
    }

    setIsSending(false)
  }

  const showResults =
    listOpen && query.length >= 2 && Boolean(availableParents?.length)

  return (
    <WhiteCard>
      <Stack spacing={1}>
        <Typography variant="h2">Invite parents</Typography>

        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Search for parents by email and select everyone you want to invite to
          this class.
        </Typography>

        <Box ref={setInputElement} sx={{ width: '100%', mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Parent email"
            placeholder="Enter parent's email"
            value={email}
            disabled={isSending}
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
          anchorEl={inputElement}
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
            width: inputElement?.clientWidth,
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
              {availableParents?.map((parent, index) => (
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
                    borderBottom: index < availableParents.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover',
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
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
          availableParents?.length === 0 && (
            <Alert severity="info">No available parents found.</Alert>
          )}

        {selectedParents.length > 0 && (
          <>
            <Typography sx={{ fontSize: 14, fontWeight: 600, pt: 1 }}>
              Selected parents ({selectedParents.length})
            </Typography>

            {selectedParents.map((parent) => (
              <Box
                key={parent.id}
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
                <Avatar src={parent.avatar_url ?? undefined}>
                  {parent.first_name[0]}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
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

                <IconButton
                  size="small"
                  aria-label={`Remove ${parent.email}`}
                  disabled={isSending}
                  onClick={() => removeParent(parent.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}

            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
              <AppButton
                label={`Send invitations (${selectedParents.length})`}
                loading={isSending}
                disabled={isSending}
                onClick={sendInvites}
              />
            </Stack>
          </>
        )}

        {sendResult && (
          <>
            {sendResult.sent > 0 && (
              <Alert severity="success">
                Successfully sent {sendResult.sent}{' '}
                {sendResult.sent === 1 ? 'invitation' : 'invitations'}.
              </Alert>
            )}

            {sendResult.failed > 0 && (
              <Alert severity="error">
                Could not send {sendResult.failed}{' '}
                {sendResult.failed === 1 ? 'invitation' : 'invitations'}. You
                can try again.
              </Alert>
            )}
          </>
        )}
      </Stack>
    </WhiteCard>
  )
}
