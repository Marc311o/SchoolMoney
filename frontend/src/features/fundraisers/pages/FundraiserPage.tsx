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

import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import StatusBadge from '@/components/StatusBadge'
import AppAvatar from '@/components/AppAvatar'
import FundraiserTreasurerActions from '@/features/fundraisers/components/FundraiserTreasurerActions'

import { useClass } from '@/features/classes/api'
import { useWallet } from '@/features/wallet/api'

import WithdrawFundraiserDialog from '@/features/fundraisers/components/WithdrawFundraiserDialog'
import DepositFundraiserDialog from '@/features/fundraisers/components/DepositFundraiserDialog'

import {
  useFundraiser,
  useUpdateFundraiser,
  useCreateFundraiserPayment,
  useRefundFundraiserPayment,
  type FundraiserUpdate,
  useCreateTreasurerWithdrawal,
  useCreateTreasurerDeposit,
  useTreasurerOperations,
  useCloseFundraiser,
  useFundraiserChildren,
} from '@/features/fundraisers/api'

import FundraiserProgress from '@/features/fundraisers/components/FundraiserProgress'
import FundraiserAccountCard from '@/features/fundraisers/components/FundraiserAccountCard'
import FundraiserChildren from '@/features/fundraisers/components/FundraiserChildren'
import FundraiserPayments from '@/features/fundraisers/components/FundraiserPayments'
import EditFundraiserDialog from '@/features/fundraisers/components/EditFundraiserDialog'
import PayFundraiserDialog from '@/features/fundraisers/components/PayFundraiserDialog'
import RefundFundraiserDialog from '@/features/fundraisers/components/RefundFundraiserDialog'

import { fullName } from '@/lib/names'

import FundraiserWithdrawals from '@/features/fundraisers/components/FundraiserWithdrawals'
import FundraiserDeposits from '@/features/fundraisers/components/FundraiserDeposits'
import CloseFundraiserDialog from '@/features/fundraisers/components/CloseFundraiserDialog'

export default function FundraiserPage() {
  const { fundraiserId = '' } = useParams()

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  const { data: fundraiser, isPending, error } = useFundraiser(fundraiserId)

  const { data: wallet, isPending: walletPending } = useWallet()

  const { data: schoolClass, isPending: classPending } = useClass(
    fundraiser?.class_id ?? '',
  )

  // Children and their payment information come from one endpoint.
  const { data: fundraiserChildren, isPending: childrenPending } =
    useFundraiserChildren(fundraiserId)

  const children = fundraiserChildren?.children ?? []

  // Only children belonging to the current user.
  const myChildren = children.filter((item) => item.is_current_user_child)

  const { data: operations = [], isPending: operationsPending } =
    useTreasurerOperations(fundraiserId)

  const withdrawals = operations.filter(
    (operation) => operation.direction === 'WITHDRAWAL',
  )

  const deposits = operations.filter(
    (operation) => operation.direction === 'DEPOSIT',
  )

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const updateFundraiser = useUpdateFundraiser()

  const createPayment = useCreateFundraiserPayment(fundraiserId)

  const refundPayment = useRefundFundraiserPayment(fundraiserId)

  const createWithdrawal = useCreateTreasurerWithdrawal(fundraiserId)

  const createDeposit = useCreateTreasurerDeposit(fundraiserId)

  const closeFundraiser = useCloseFundraiser(fundraiserId)

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

  const [withdrawingPaymentId, setWithdrawingPaymentId] = useState<
    string | null
  >(null)

  const [withdrawing, setWithdrawing] = useState(false)

  const [depositing, setDepositing] = useState(false)

  const [closing, setClosing] = useState(false)

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
        onError: (paymentError) => {
          notify(paymentError.message || 'Could not complete payment', 'error')
        },
      },
    )
  }

  const handleWithdraw = () => {
    if (!withdrawingPaymentId) return

    refundPayment.mutate(
      {
        paymentId: withdrawingPaymentId,
      },
      {
        onSuccess: () => {
          notify('Payment refunded successfully')
          setWithdrawingPaymentId(null)
        },
        onError: (refundError) => {
          notify(refundError.message || 'Could not refund payment', 'error')
        },
      },
    )
  }

  const handleTreasurerWithdrawal = (
    amount: string,
    description: string | null,
  ) => {
    createWithdrawal.mutate(
      { amount, description },
      {
        onSuccess: () => {
          notify('Money withdrawn successfully')
          setWithdrawing(false)
        },
        onError: (mutationError) => {
          notify(mutationError.message || 'Could not withdraw money', 'error')
        },
      },
    )
  }

  const handleTreasurerDeposit = (
    amount: string,
    description: string | null,
  ) => {
    createDeposit.mutate(
      { amount, description },
      {
        onSuccess: () => {
          notify('Money deposited successfully')
          setDepositing(false)
        },
        onError: (mutationError) => {
          notify(mutationError.message || 'Could not deposit money', 'error')
        },
      },
    )
  }

  const handleCloseFundraiser = () => {
    closeFundraiser.mutate(undefined, {
      onSuccess: (result) => {
        notify(
          `Fundraiser closed successfully. Refunded ${result.refunded_total} (${result.refund_transactions} transactions).`,
        )
        setClosing(false)
      },
      onError: (closeError) => {
        notify(closeError.message || 'Could not close fundraiser', 'error')
      },
    })
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

  const isTreasurer = schoolClass?.my_role === 'TREASURER'

  const isBlocked = fundraiser.is_blocked

  const canEditFundraiser =
    isTreasurer && fundraiser.status === 'ACTIVE' && !isBlocked

  const actionsEnabled = fundraiser.status === 'ACTIVE' && !isBlocked

  // Find the selected child directly in the children endpoint response.
  const payingChild = children.find((item) => item.child.id === payingChildId)

  // Find the payment and its child using the same endpoint response.
  const withdrawingChild = children.find(
    (item) => item.payment.id === withdrawingPaymentId,
  )

  const withdrawingPayment = withdrawingChild?.payment

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
              `starts ${formatDate(fundraiser.start_date)} · ends ${formatDate(fundraiser.end_date)}`,
            ]
              .filter(Boolean)
              .join(' · ')}
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

      {canEditFundraiser && (
        <FundraiserTreasurerActions
          onWithdrawToWallet={() => {
            createWithdrawal.reset()
            setWithdrawing(true)
          }}
          onDepositBack={() => {
            createDeposit.reset()
            setDepositing(true)
          }}
          onAddInvoice={() => {
            // TODO: implement add invoice
          }}
          onCloseAndRefund={() => {
            closeFundraiser.reset()
            setClosing(true)
          }}
          onEdit={() => {
            updateFundraiser.reset()
            setEditing(true)
          }}
        />
      )}

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
              items={myChildren}
              loading={childrenPending}
              actionsEnabled={actionsEnabled}
              onPay={(childId) => {
                createPayment.reset()
                setPayingChildId(childId)
              }}
              onWithdraw={(paymentId) => {
                refundPayment.reset()
                setWithdrawingPaymentId(paymentId)
              }}
            />
          </PageSection>

          <PageSection title="Payments">
            <FundraiserPayments
              items={children}
              loading={childrenPending}
              actionsEnabled={actionsEnabled}
              isClosed={fundraiser.status === 'CLOSED'}
              onPay={(childId) => {
                createPayment.reset()
                setPayingChildId(childId)
              }}
            />
          </PageSection>
        </Stack>

        {/* Right column */}
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <PageSection title="Account">
            <FundraiserAccountCard
              iban={fundraiser.iban}
              balance={fundraiser.progress.current_balance}
              collected={fundraiser.progress.paid_total}
              withdrawals={fundraiser.progress.treasurer_withdrawn_total}
              deposits={fundraiser.progress.treasurer_deposited_total}
            />
          </PageSection>

          <FundraiserWithdrawals
            withdrawals={withdrawals}
            loading={operationsPending}
          />

          <FundraiserDeposits deposits={deposits} loading={operationsPending} />
        </Stack>
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
          amount={
            fundraiser.children.find((item) => item.child_id === payingChildId)
              ?.remaining_amount ?? fundraiser.required_amount_per_child
          }
          walletBalance={wallet?.balance ?? '0'}
          walletLoading={walletPending}
          loading={createPayment.isPending}
          onClose={() => setPayingChildId(null)}
          onConfirm={handlePay}
        />
      )}

      {/* Withdraw payment dialog */}
      {withdrawingPaymentId && withdrawingPayment && withdrawingChild && (
        <RefundFundraiserDialog
          open
          childName={fullName(withdrawingChild.child)}
          amount={withdrawingPayment.amount ?? '0'}
          loading={refundPayment.isPending}
          onClose={() => setWithdrawingPaymentId(null)}
          onConfirm={handleWithdraw}
        />
      )}

      {/* Treasurer - Withdraw to wallet dialog */}
      <WithdrawFundraiserDialog
        open={withdrawing}
        fundraiserBalance={fundraiser.progress.current_balance}
        walletBalance={wallet?.balance ?? '0'}
        walletLoading={walletPending}
        loading={createWithdrawal.isPending}
        onClose={() => setWithdrawing(false)}
        onConfirm={handleTreasurerWithdrawal}
      />

      {/* Treasurer - Deposit dialog */}
      <DepositFundraiserDialog
        open={depositing}
        fundraiserBalance={fundraiser.progress.current_balance}
        walletBalance={wallet?.balance ?? '0'}
        walletLoading={walletPending}
        loading={createDeposit.isPending}
        onClose={() => setDepositing(false)}
        onConfirm={handleTreasurerDeposit}
      />

      {/* Close fundraiser dialog */}
      <CloseFundraiserDialog
        open={closing}
        loading={closeFundraiser.isPending}
        onClose={() => setClosing(false)}
        onConfirm={handleCloseFundraiser}
      />

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
