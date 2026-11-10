import { Stack } from '@mui/material'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'

export function AdminFundraisersPage() {
  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <PageHeader
        title="Fundraisers"
        subtitle="All fundraisers in every class. A blocked fundraiser takes no payments, refunds or withdrawals."
      />
      <EmptyState
        dashed
        title="Coming soon"
        description="This page is built later"
      />
    </Stack>
  )
}
