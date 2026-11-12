import { Stack } from '@mui/material'

import StatusBadge, { type StatusBadgeTone } from '@/components/StatusBadge'
import type { AdminFundraiser } from '@/features/admin/api'

const STATUSES: Record<
  AdminFundraiser['status'],
  { label: string; tone: StatusBadgeTone }
> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
  DRAFT: { label: 'Draft', tone: 'neutral' },
}

interface FundraiserStatusLabelProps {
  status: AdminFundraiser['status']
  blocked: boolean
  compact?: boolean
}

export function FundraiserStatusLabel({
  status,
  blocked,
  compact = false,
}: FundraiserStatusLabelProps) {
  const { label, tone } = STATUSES[status]

  return (
    <Stack direction="row" sx={{ gap: compact ? 0.5 : 0.75 }}>
      <StatusBadge tone={tone} compact={compact}>
        {label}
      </StatusBadge>
      {blocked && (
        <StatusBadge tone="danger" compact={compact}>
          Blocked
        </StatusBadge>
      )}
    </Stack>
  )
}
