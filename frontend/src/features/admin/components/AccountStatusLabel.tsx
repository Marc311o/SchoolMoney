import { Box, Tooltip } from '@mui/material'

import type { AccountStatus } from '@/features/admin/api'

const STATUSES = {
  ACTIVE: { label: 'Active', letter: 'A', bg: '#DDEFE4', fg: '#17583D' },
  BLOCKED: { label: 'Blocked', letter: 'B', bg: '#FBE3DA', fg: '#8A2A0C' },
  PENDING_ACTIVATION: {
    label: 'Not activated',
    letter: 'N',
    bg: '#ECEEE8',
    fg: '#3F4842',
  },
} as const

/** Read by screen readers, not shown */
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

interface AccountStatusLabelProps {
  status: AccountStatus
  /** Narrow screens: one letter in a circle, the word in a tooltip */
  compact?: boolean
}

/** A small, quiet pill: the status is information, not a call to action */
export function AccountStatusLabel({
  status,
  compact = false,
}: AccountStatusLabelProps) {
  const { label, letter, bg, fg } = STATUSES[status]

  if (!compact) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          px: 1.25,
          py: 0.25,
          borderRadius: 999,
          bgcolor: bg,
          color: fg,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: '18px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Box>
    )
  }

  return (
    <Tooltip title={label}>
      <Box
        component="span"
        sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: bg,
          color: fg,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        <span aria-hidden="true">{letter}</span>
        <Box component="span" sx={visuallyHidden}>
          {label}
        </Box>
      </Box>
    </Tooltip>
  )
}
