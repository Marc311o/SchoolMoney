import { useState } from 'react'

import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'

import { Link as RouterLink, useParams } from 'react-router'

import AppButtonOutlined from '@/components/AppButtonOutlined'
import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import StatusBadge from '@/components/StatusBadge'
import AppAvatar from '@/components/AppAvatar'

import { useCurrentUser } from '@/features/auth/api'
import { useClass } from '@/features/classes/api'
import { useWallet } from '@/features/wallet/api'

import {
  useFundraiser,
  useFundraiserPayments,
  useUpdateFundraiser,
  useCreateFundraiserPayment,
  type FundraiserUpdate,
} from '@/features/fundraisers/api'

import FundraiserProgress from '@/features/fundraisers/components/FundraiserProgress'
import FundraiserAccountCard from '@/features/fundraisers/components/FundraiserAccountCard'
import FundraiserChildren from '@/features/fundraisers/components/FundraiserChildren'
import FundraiserPayments from '@/features/fundraisers/components/FundraiserPayments'
import EditFundraiserDialog from '@/features/fundraisers/components/EditFundraiserDialog'
import PayFundraiserDialog from '@/features/fundraisers/components/PayFundraiserDialog'

import { fullName } from '@/lib/names'

export default function FundraiserPage() {
  const { fundraiserId = '' } = useParams()

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const { data: fundraiser, isPending, error } = useFundraiser(fundraiserId)

  const { data: me } = useCurrentUser()

  const { data: wallet, isPending: walletPending } = useWallet()

  const { data: schoolClass, isPending: classPending } = useClass(
    fundraiser?.class_id ?? '',
  )

  const { data: payments = [], isPending: paymentsPending } =
    useFundraiserPayments(fundraiserId)

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateFundraiser = useUpdateFundraiser()

  const createPayment = useCreateFundraiserPayment(fundraiserId)

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [editing, setEditing] = useState(false)

  const [payingChildId, setPayingChildId] = useState<string | null>(null)

  const [toast, setToast] = useState<{
    message: string
    severity: SnackbarSeverity
    id: number
  } | null>(null)

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDate(value: string) {
    if (!value) return '—'

    const date = new Date(`${value}T00:00:00`)

    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  const notify = (message: string, severity: SnackbarSeverity = 'success') => {
    setToast({ message, severity, id: Date.now() })
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleUpdateFundraiser = (payload: FundraiserUpdate) => {
    if (!fundraiser) return

    updateFundraiser.mutate(
      {
        fundraiserId: fundraiser.id,
        payload,
      },
      {
        onSuccess: () => {
          notify('Fundraiser updated successfully')
          setEditing(false)
        },
        onError: () => {
          notify('Could not update fundraiser', 'error')
        },
      },
    )
  }

  const handlePay = () => {
    if (!payingChildId) return

    createPayment.mutate(
      {
        child_id: payingChildId,
      },
      {
        onSuccess: () => {
          notify('Payment completed successfully')
          setPayingChildId(null)
        },
        onError: (error) => {
          notify(error.message || 'Could not complete payment', 'error')
        },
      },
    )
  }

  // ---------------------------------------------------------------------------
  // Loading and error states
  // ---------------------------------------------------------------------------

  if (isPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  if (error || !fundraiser) {
    return (
      <Stack spacing={2} sx={{ p: '1em' }}>
        <Typography variant="h5">Could not load fundraiser</Typography>

        <Link component={RouterLink} to="/classes">
          Back to classes
        </Link>
      </Stack>
    )
  }

  if (classPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const allChildren =
    schoolClass?.children.filter((member) => member.status === 'ACTIVE') ?? []

  const myChildren = allChildren.filter((member) => member.parent.id === me?.id)

  const isTreasurer = schoolClass?.my_role === 'TREASURER'
  const isBlocked = fundraiser.is_blocked

  const canEditFundraiser =
    isTreasurer && fundraiser.status === 'ACTIVE' && !isBlocked

  const actionsEnabled = fundraiser.status === 'ACTIVE' && !isBlocked

  const payingChild = myChildren.find(
    (member) => member.child.id === payingChildId,
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ fontSize: 14 }}>
        <Link component={RouterLink} to="/classes" underline="hover">
          Classes
        </Link>

        <Link
          component={RouterLink}
          to={`/classes/${fundraiser.class_id}`}
          underline="hover"
        >
          {schoolClass?.name ?? 'Class'}
        </Link>

        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {fundraiser.name}
        </Typography>
      </Breadcrumbs>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <AppAvatar
          name={fundraiser.name}
          src={fundraiser.logo_url}
          size={64}
          square
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <PageHeader
            title={fundraiser.name}
            badge={
              <StatusBadge>
                {isBlocked ? 'Blocked' : fundraiser.status}
              </StatusBadge>
            }
            subtitle={[
              schoolClass?.name,
              schoolClass?.school_name,
              `${formatDate(fundraiser.start_date)} – ${formatDate(fundraiser.end_date)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
            actions={
              canEditFundraiser && (
                <AppButtonOutlined
                  label="Edit fundraiser"
                  onClick={() => {
                    updateFundraiser.reset()
                    setEditing(true)
                  }}
                />
              )
            }
          >
            {fundraiser.description && (
              <Typography color="text.secondary">
                {fundraiser.description}
              </Typography>
            )}
          </PageHeader>
        </Box>
      </Stack>

      <PageSection title="Progress">
        <FundraiserProgress progress={fundraiser.progress} />
      </PageSection>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 3fr) minmax(280px, 2fr)',
          },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <PageSection
            title={
              actionsEnabled
                ? 'Your children'
                : 'Your children who participated'
            }
          >
            <FundraiserChildren
              members={myChildren}
              childrenProgress={fundraiser.children}
              payments={payments}
              actionsEnabled={actionsEnabled}
              onPay={(childId) => {
                createPayment.reset()
                setPayingChildId(childId)
              }}
              onWithdraw={() => {
                // TODO Open refund confirmation dialog
              }}
            />
          </PageSection>

          <PageSection title="Payments">
            <FundraiserPayments
              payments={payments}
              members={schoolClass?.children ?? []}
              childrenProgress={fundraiser.children}
              loading={paymentsPending || classPending}
              actionsEnabled={actionsEnabled}
              onPay={() => {
                // TODO Open payment confirmation dialog
              }}
            />
          </PageSection>
        </Stack>

        {/* Right column */}
        <Box sx={{ minWidth: 0 }}>
          <PageSection title="Account">
            <FundraiserAccountCard
              iban={fundraiser.iban}
              balance={fundraiser.progress.current_balance}
            />
          </PageSection>
        </Box>
      </Box>

      {/* Edit fundraiser dialog */}
      {editing && (
        <EditFundraiserDialog
          key={fundraiser.id}
          open
          fundraiser={fundraiser}
          onClose={() => setEditing(false)}
          onConfirm={handleUpdateFundraiser}
          loading={updateFundraiser.isPending}
          error={updateFundraiser.error}
        />
      )}

      {/* Payment dialog */}
      {payingChild && (
        <PayFundraiserDialog
          open
          childName={fullName(payingChild.child)}
          amount={fundraiser.required_amount_per_child}
          walletBalance={wallet?.balance ?? '0'}
          walletLoading={walletPending}
          loading={createPayment.isPending}
          onClose={() => setPayingChildId(null)}
          onConfirm={handlePay}
        />
      )}

      {/* Snackbar */}
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
