import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useCurrentUser } from '@/features/auth/api'
import {
  type ClassMemberWithParent,
  isClassNotFound,
  useClass,
  useRemoveMembership,
  useReviewMembership,
} from '@/features/classes/api'
import { AccessCodeCard } from '@/features/classes/components/AccessCodeCard'
import { LeaveClassSection } from '@/features/classes/components/LeaveClassSection'
import { ClassChildrenList } from '@/features/classes/components/ClassChildrenList'
import { WaitingList } from '@/features/classes/components/WaitingList'
import { ParentSearchSection } from '@/features/classes/components/ParentSearchSection'
import { fullName } from '@/lib/names'
import { useState } from 'react'
import AppButton from '@/components/AppButton'
import CreateFundraiserDialog from '@/features/fundraisers/components/CreateFundraiserDialog'
import {
  useCreateFundraiser,
  useFundraisers,
  useUpdateFundraiser,
  type Fundraiser,
  type FundraiserUpdate,
} from '@/features/fundraisers/api'
import { type FundraiserCreate } from '@/features/fundraisers/api'
import FundraiserList from '@/features/fundraisers/components/FundraiserList'
import FundraiserFilter, {
  type FundraiserFilterValue,
} from '@/features/classes/components/FundraiserFilter'
import EditFundraiserDialog from '@/features/fundraisers/components/EditFundraiserDialog'

export function ClassPage() {
  const { classId = '' } = useParams()
  const { data: schoolClass, isPending, error } = useClass(classId)
  const { data: me } = useCurrentUser()
  const review = useReviewMembership(classId)
  const navigate = useNavigate()
  const [toast, setToast] = useState<{
    message: string
    severity: SnackbarSeverity
    id: number
  } | null>(null)

  const removeMembership = useRemoveMembership(classId)
  const [toReject, setToReject] = useState<ClassMemberWithParent | null>(null)
  const [toRemove, setToRemove] = useState<ClassMemberWithParent | null>(null)

  const [createFundraiserOpen, setCreateFundraiserOpen] = useState(false)
  const createFundraiser = useCreateFundraiser()
  const { data: fundraisers = [], isPending: fundraisersPending } =
    useFundraisers(classId)

  const [fundraiserFilter, setFundraiserFilter] =
    useState<FundraiserFilterValue>('all')
  const [editingFundraiser, setEditingFundraiser] = useState<Fundraiser | null>(
    null,
  )
  const updateFundraiser = useUpdateFundraiser()

  const filteredFundraisers = fundraisers.filter((fundraiser) => {
    if (fundraiserFilter === 'all') return true
    return fundraiser.status?.toLowerCase() === fundraiserFilter
  })

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

  const remove = () => {
    if (!toRemove || !schoolClass) return
    const losesAccess =
      schoolClass.my_role !== 'TREASURER' &&
      !schoolClass.children.some(
        (m) =>
          m.id !== toRemove.id &&
          m.status === 'ACTIVE' &&
          m.parent.id === me?.id,
      )

    removeMembership.mutate(toRemove.id, {
      onSuccess: () => {
        if (losesAccess) {
          navigate('/classes', { replace: true })
          return
        }
        notify(`${toRemove.child.first_name} removed from the class`)
        setToRemove(null)
      },
    })
  }

  const handleCreateFundraiser = (payload: FundraiserCreate) => {
    createFundraiser.mutate(payload, {
      onSuccess: () => {
        notify('Fundraiser created successfully')
        setCreateFundraiserOpen(false)
      },
      onError: () => {
        notify('Could not create fundraiser', 'error')
      },
    })
  }

  const handleUpdateFundraiser = (payload: FundraiserUpdate) => {
    if (!editingFundraiser) return

    updateFundraiser.mutate(
      {
        fundraiserId: editingFundraiser.id,
        payload,
      },
      {
        onSuccess: () => {
          notify('Fundraiser updated successfully')
          setEditingFundraiser(null)
        },
        onError: () => {
          notify('Could not update fundraiser', 'error')
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

  const existingParentIds = schoolClass.children
    .filter(
      (member) => member.status === 'ACTIVE' || member.status === 'PENDING',
    )
    .map((member) => member.parent.id)

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
        actions={
          isTreasurer && (
            <AppButton
              label="New fundraiser"
              onClick={() => {
                createFundraiser.reset()
                setCreateFundraiserOpen(true)
              }}
            />
          )
        }
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
            alignItems: 'stretch',
            '& > *': {
              minHeight: 280,
            },
          }}
        >
          <AccessCodeCard classId={classId} onNotify={notify} />
          <ParentSearchSection
            classId={classId}
            existingParentIds={existingParentIds}
          />
        </Box>
      )}
      {isTreasurer && waiting.length > 0 && (
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
          onRemove={(member) => {
            removeMembership.reset()
            setToRemove(member)
          }}
        />
      </PageSection>

      <PageSection
        title="Fundraisers"
        count={filteredFundraisers.length}
        action={
          fundraisers.length > 0 && (
            <FundraiserFilter
              value={fundraiserFilter}
              onChange={setFundraiserFilter}
            />
          )
        }
      >
        <FundraiserList
          fundraisers={fundraisers}
          filteredFundraisers={filteredFundraisers}
          loading={fundraisersPending}
          isTreasurer={isTreasurer}
        />
      </PageSection>

      {!isTreasurer && (
        <LeaveClassSection
          myChildren={members.filter((m) => m.parent.id === me?.id)}
          className={schoolClass.name}
          onLeave={(member) => {
            removeMembership.reset()
            setToRemove(member)
          }}
        />
      )}
      <ConfirmDialog
        open={toReject !== null}
        title={`Reject ${toReject ? fullName(toReject.child) : ''}?`}
        description={`${toReject?.child.first_name ?? 'The child'} will not join the class. 
              The parent can ask again with the access code.`}
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
      <ConfirmDialog
        open={toRemove !== null}
        title={`Remove ${toRemove ? fullName(toRemove.child) : ''}?`}
        description={`${toRemove?.child.first_name ?? 'The child'} leaves the class. 
              Payments already made stay in the history, 
              and ${isTreasurer ? 'the parent' : 'you'} can join again with the access code.`}
        confirmLabel="Remove"
        destructive
        loading={removeMembership.isPending}
        error={
          removeMembership.isError
            ? 'Could not remove the child. Please try again.'
            : null
        }
        onConfirm={remove}
        onClose={() => setToRemove(null)}
      />
      <AppSnackbar
        key={toast?.id}
        open={toast !== null}
        message={toast?.message ?? ''}
        severity={toast?.severity}
        variant="standard"
        onClose={() => setToast(null)}
      />
      <CreateFundraiserDialog
        open={createFundraiserOpen}
        classId={classId}
        onClose={() => setCreateFundraiserOpen(false)}
        onConfirm={handleCreateFundraiser}
        loading={createFundraiser.isPending}
        error={createFundraiser.error}
      />
      {editingFundraiser && (
        <EditFundraiserDialog
          key={editingFundraiser.id}
          open
          fundraiser={editingFundraiser}
          onClose={() => setEditingFundraiser(null)}
          onConfirm={handleUpdateFundraiser}
          loading={updateFundraiser.isPending}
          error={updateFundraiser.error}
        />
      )}
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
