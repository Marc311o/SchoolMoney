import { Box, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'

const TONES = {
  warning: { bgcolor: 'warning.light', color: 'warning.dark' },
  success: { bgcolor: 'primary.light', color: 'primary.dark' },
  danger: { bgcolor: 'error.light', color: 'error.dark' },
  neutral: { bgcolor: 'background.default', color: 'text.secondary' },
} as const

export type StatusBadgeTone = keyof typeof TONES

/** Read by screen readers, not shown */
const visuallyHidden = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

interface StatusBadgeProps {
  children: ReactNode
  tone?: StatusBadgeTone
  compact?: boolean
  letter?: string
}

/** A small pill: "Treasurer", "Waiting", "Member" */
export default function StatusBadge({
  children,
  tone = 'warning',
  compact = false,
  letter,
}: StatusBadgeProps) {
  if (compact) {
    const shown = letter ?? (typeof children === 'string' ? children[0] : '')

    return (
      <Tooltip title={children}>
        <Box
          component="span"
          sx={{
            ...TONES[tone],
            flex: 'none',
            width: 26,
            height: 26,
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span aria-hidden="true">{shown}</span>
          <Box component="span" sx={visuallyHidden}>
            {children}
          </Box>
        </Box>
      </Tooltip>
    )
  }

  return (
    <Typography
      component="span"
      sx={{
        ...TONES[tone],
        flex: 'none',
        px: 1.25,
        py: 0.25,
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Typography>
  )
}
