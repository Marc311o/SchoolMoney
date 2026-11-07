import { useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import SendRoundedIcon from '@mui/icons-material/SendRounded'

import TextInput from '@/components/TextInput'

/** The same limit as the API */
const MAX_LENGTH = 2000

interface MessageComposerProps {
  /** Resolves when the message is saved; the draft is cleared only then */
  onSend: (content: string) => Promise<unknown>
  sending: boolean
  error: string | null
}

/** Enter sends, Shift+Enter adds a new line */
export function MessageComposer({
  onSend,
  sending,
  error,
}: MessageComposerProps) {
  const [draft, setDraft] = useState('')
  const content = draft.trim()
  const tooLong = content.length > MAX_LENGTH
  const canSend = content.length > 0 && !tooLong && !sending

  const send = () => {
    if (!canSend) return
    onSend(content).then(
      () => setDraft(''),
      // the error is shown below; keep the text so it can be sent again
      () => {},
    )
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    send()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // isComposing: Enter that confirms an accented letter (IME) must not send
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      send()
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        px: { xs: 1.5, sm: 2.5 },
        py: 1.75,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.25 }}>
        <TextInput
          value={draft}
          onChange={setDraft}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          ariaLabel="Message"
          multiline
          maxRows={5}
        />
        <IconButton
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          sx={{
            flex: 'none',
            width: 44,
            height: 44,
            borderRadius: '10px',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',

            '&:hover': { bgcolor: 'primary.dark' },

            '&.Mui-disabled': {
              bgcolor: 'divider',
              color: 'text.secondary',
            },
          }}
        >
          <SendRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {(error || tooLong) && (
        <Typography color="error" sx={{ mt: 0.75, fontSize: 12 }}>
          {tooLong
            ? `A message can have up to ${MAX_LENGTH} characters (${content.length} now).`
            : error}
        </Typography>
      )}
    </Box>
  )
}
