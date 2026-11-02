import { Typography } from '@mui/material'
import type { ReactNode } from 'react'

const TONES = {
  warning: { bgcolor: 'warning.light', color: 'warning.dark' },
  success: { bgcolor: 'primary.light', color: 'primary.dark' },
  neutral: { bgcolor: 'background.default', color: 'text.secondary' },
} as const

interface StatusBadgeProps {
  children: ReactNode
  tone?: keyof typeof TONES
}

/** A small pill: "Treasurer", "Waiting", "Member" */
export default function StatusBadge({
  children,
  tone = 'warning',
}: StatusBadgeProps) {
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
