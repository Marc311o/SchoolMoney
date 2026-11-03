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
import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useCurrentUser } from '@/features/auth/api'
import {
  type ClassMemberWithParent,
  isClassNotFound,
  useClass,
  useReviewMembership,
} from '@/features/classes/api'
import { AccessCodeCard } from '@/features/classes/components/AccessCodeCard'
import { ClassChildrenList } from '@/features/classes/components/ClassChildrenList'
import { WaitingList } from '@/features/classes/components/WaitingList'
import { fullName } from '@/lib/names'
import { useState } from 'react'

export function ClassPage() {
  const { classId = '' } = useParams()
  const { data: schoolClass, isPending, error } = useClass(classId)
  const { data: me } = useCurrentUser()
  const review = useReviewMembership(classId)
  const [toast, setToast] = useState<{
    message: string
    severity: SnackbarSeverity
    id: number
  } | null>(null)
  const [toReject, setToReject] = useState<ClassMemberWithParent | null>(null)

  const notify = (message: string, severity: SnackbarSeverity = 'success') =>
    setToast({ message, severity, id: Date.now() })

  const approve = (member: ClassMemberWithParent) => {
    review.mutate(
      { membershipId: member.id, status: 'ACTIVE' },
      {
        onSuccess: () => notify(`${member.child.first_name} joined the class`),
        onError: () => notify('Could not approve the request', 'error'),
      },
    )
  }

  const reject = () => {
    if (!toReject) return
    review.mutate(
      { membershipId: toReject.id, status: 'REJECTED' },
      {
        onSuccess: () => {
          notify(`Request for ${toReject.child.first_name} rejected`)
          setToReject(null)
        },
      },
    )
  }

  if (isPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  if (error) {
    return <ClassLoadError notFound={isClassNotFound(error)} />
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
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
          }}
        >
          <AccessCodeCard classId={classId} onNotify={notify} />
          <EmptyState dashed description="Inviting parents: coming soon." />
        </Box>
      )}

      {isTreasurer && (
        <PageSection title="Waiting for approval" count={waiting.length}>
          <WaitingList
            members={waiting}
            onApprove={approve}
            onReject={(member) => {
              review.reset()
              setToReject(member)
            }}
            approvingId={
              review.isPending && review.variables.status === 'ACTIVE'
                ? review.variables.membershipId
                : null
            }
          />
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

      <ConfirmDialog
        open={toReject !== null}
        title={`Reject ${toReject ? fullName(toReject.child) : ''}?`}
        description={`${toReject?.child.first_name ?? 'The child'} will not join the class. The parent can ask again with the access code.`}
        confirmLabel="Reject"
        destructive
        loading={review.isPending}
        error={
          review.isError
            ? 'Could not reject the request. Please try again.'
            : null
        }
        onConfirm={reject}
        onClose={() => setToReject(null)}
      />

      <AppSnackbar
        key={toast?.id}
        open={toast !== null}
        message={toast?.message ?? ''}
        severity={toast?.severity}
        variant="standard"
        onClose={() => setToast(null)}
      />
    </Stack>
  )
}

function ClassLoadError({ notFound }: { notFound: boolean }) {
  return (
    <Stack spacing={2} sx={{ p: '1em', alignItems: 'flex-start' }}>
      <Typography variant="h1">
        {notFound ? 'Class not found' : 'Could not load the class'}
      </Typography>
      <Link component={RouterLink} to="/classes">
        Back to classes
      </Link>
    </Stack>
  )
}

function childrenCount(count: number): string {
  return count === 1 ? '1 child' : `${count} children`
}
