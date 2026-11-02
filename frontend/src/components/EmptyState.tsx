import { Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

import WhiteCard from '@/components/WhiteCard'

interface EmptyStateProps {
  /** With a title the content is centred and larger (a whole empty page) */
  title?: ReactNode
  description: ReactNode
  actions?: ReactNode
  /** Dashed outline and no background: "nothing here yet" */
  dashed?: boolean
}

export default function EmptyState({
  title,
  description,
  actions,
  dashed = false,
}: EmptyStateProps) {
  const cardSx = dashed
    ? { bgcolor: 'transparent', borderStyle: 'dashed' }
    : undefined

  // Small: one line inside a section, e.g. "No pending requests."
  if (!title) {
    return (
      <WhiteCard padding={2.5} sx={cardSx}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {description}
        </Typography>
      </WhiteCard>
    )
  }

  return (
    <WhiteCard sx={cardSx}>
      <Stack
        spacing={1.5}
        sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}
      >
        <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography sx={{ maxWidth: 440, color: 'text.secondary' }}>
          {description}
        </Typography>
        {actions && (
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
          >
            {actions}
          </Stack>
        )}
      </Stack>
    </WhiteCard>
  )
}
