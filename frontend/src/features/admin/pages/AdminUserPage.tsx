import { Stack } from '@mui/material'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'

export function AdminUsersPage() {
  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <PageHeader
        title="Users"
        subtitle="Everyone with a SchoolMoney account. A blocked user can't log in or move money."
      />
      <EmptyState
        dashed
        title="Coming soon"
        description="This page is built later"
      />
    </Stack>
  )
}
