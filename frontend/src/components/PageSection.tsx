import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface PageSectionProps {
  title: ReactNode
  /** Small number next to the title, e.g. how many items the section has */
  count?: number
  /** A link or button on the right of the title */
  action?: ReactNode
  children: ReactNode
}

export default function PageSection({
  title,
  count,
  action,
  children,
}: PageSectionProps) {
  return (
    <Stack component="section" spacing={1.5}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
          <Typography variant="h2">{title}</Typography>
          {count !== undefined && (
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {count}
            </Typography>
          )}
        </Stack>
        {action}
      </Stack>
      {children}
    </Stack>
  )
}
