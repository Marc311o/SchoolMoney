import { Stack } from '@mui/material'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'

export function AdminMessagesPage() {
  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <PageHeader
        title="Messages"
        subtitle="Conversations with class treasurers"
      />
      <EmptyState
        dashed
        title="Coming soon"
        description="This page is built later"
      />
    </Stack>
  )
}
