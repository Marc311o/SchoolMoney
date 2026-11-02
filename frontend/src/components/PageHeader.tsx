import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  /** Shown next to the title, e.g. <StatusBadge> */
  badge?: ReactNode
  subtitle?: ReactNode
  /** Buttons on the right; they wrap below the title on narrow screens */
  actions?: ReactNode
  /** Anything else under the subtitle */
  children?: ReactNode
}

export default function PageHeader({
  title,
  badge,
  subtitle,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2,
      }}
    >
      <Stack spacing={1} sx={{ minWidth: 0 }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
        >
          <Typography variant="h1">{title}</Typography>
          {badge}
        </Stack>
        {subtitle && (
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
        {children}
      </Stack>

      {actions && (
        <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
          {actions}
        </Stack>
      )}
    </Stack>
  )
}
