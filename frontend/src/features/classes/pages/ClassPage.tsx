import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import StatusBadge from '@/components/StatusBadge'
import { useCurrentUser } from '@/features/auth/api'
import { isClassNotFound, useClass } from '@/features/classes/api'
import { ClassChildrenList } from '@/features/classes/components/ClassChildrenList'
import { WaitingList } from '@/features/classes/components/WaitingList'
import { fullName } from '@/lib/names'

export function ClassPage() {
  const { classId = '' } = useParams()
  const { data: schoolClass, isPending, error } = useClass(classId)
  const { data: me } = useCurrentUser()

  if (isPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  if (error) {
    return (
      <Stack spacing={2} sx={{ p: '1em', alignItems: 'flex-start' }}>
        <Typography variant="h1">
          {isClassNotFound(error)
            ? 'Class not found'
            : 'Could not load the class'}
        </Typography>
        <Link component={RouterLink} to="/classes">
          Back to classes
        </Link>
      </Stack>
    )
  }

  const isTreasurer = schoolClass.my_role === 'TREASURER'
  const members = schoolClass.children.filter((m) => m.status === 'ACTIVE')
  const waiting = schoolClass.children.filter((m) => m.status === 'PENDING')
  const treasurerName = fullName(schoolClass.treasurer)

  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ fontSize: 14 }}>
        <Link component={RouterLink} to="/classes" underline="hover">
          Classes
        </Link>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {schoolClass.name}
        </Typography>
      </Breadcrumbs>

      <PageHeader
        title={`Class ${schoolClass.name}`}
        badge={isTreasurer && <StatusBadge>You are treasurer</StatusBadge>}
        subtitle={[schoolClass.school_name, childrenCount(members.length)]
          .filter(Boolean)
          .join(' · ')}
      >
        {!isTreasurer && (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <AppAvatar
              name={treasurerName}
              src={schoolClass.treasurer.avatar_url}
              size={36}
            />
            <Typography sx={{ fontSize: 14 }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                Treasurer:{' '}
              </Box>
              <b>{treasurerName}</b>
            </Typography>
          </Stack>
        )}
      </PageHeader>

      {isTreasurer && (
        <PageSection title="Waiting for approval" count={waiting.length}>
          {/* TODO: pass onApprove / onReject when the endpoint exists */}
          <WaitingList members={waiting} />
        </PageSection>
      )}

      <PageSection title="Children" count={members.length}>
        <ClassChildrenList
          members={members}
          currentUserId={me?.id}
          emptyText="No children in this class yet."
          showRemove={isTreasurer}
        />
      </PageSection>

      <PageSection title="Fundraisers">
        <EmptyState dashed description="Coming soon." />
      </PageSection>
    </Stack>
  )
}

function childrenCount(count: number): string {
  return count === 1 ? '1 child' : `${count} children`
}
