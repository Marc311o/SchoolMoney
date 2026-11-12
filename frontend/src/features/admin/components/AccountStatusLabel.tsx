import StatusBadge, { type StatusBadgeTone } from '@/components/StatusBadge'
import type { AccountStatus } from '@/features/admin/api'

const STATUSES: Record<
  AccountStatus,
  { label: string; tone: StatusBadgeTone }
> = {
  ACTIVE: { label: 'Active', tone: 'success' },
  BLOCKED: { label: 'Blocked', tone: 'danger' },
  PENDING_ACTIVATION: { label: 'Not activated', tone: 'neutral' },
}

interface AccountStatusLabelProps {
  status: AccountStatus
  compact?: boolean
}

export function AccountStatusLabel({
  status,
  compact = false,
}: AccountStatusLabelProps) {
  const { label, tone } = STATUSES[status]

  return (
    <StatusBadge tone={tone} compact={compact}>
      {label}
    </StatusBadge>
  )
}
