import { Stack, Typography, Box } from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import AppAvatar from '@/components/AppAvatar'
import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'

import { fullName } from '@/lib/names'

import {
  type FundraiserChildProgress,
  type FundraiserPayment,
} from '@/features/fundraisers/api'

import { type ClassMemberWithParent } from '@/features/classes/api'
import StatusBadge from '@/components/StatusBadge.tsx'

interface FundraiserChildrenProps {
  members: ClassMemberWithParent[]
  childrenProgress: FundraiserChildProgress[]
  payments: FundraiserPayment[]
  onPay: (childId: string) => void
  onWithdraw: (paymentId: string) => void
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'PLN',
  }).format(Number(value))
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function FundraiserChildren({
  members,
  childrenProgress,
  payments,
  onPay,
  onWithdraw,
}: FundraiserChildrenProps) {
  const children = members.map((member) => {
    const progress = childrenProgress.find(
      (item) => item.child_id === member.child.id,
    )

    const payment = payments
      .filter(
        (item) =>
          item.child_id === member.child.id && item.refunded_at === null,
      )
      .sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
      )[0]

    return {
      child: member.child,
      progress,
      payment,
    }
  })

  return (
    <Stack spacing={2}>
      {children.length === 0 ? (
        <WhiteCard>
          <Typography color="text.secondary">
            No children are participating in this fundraiser.
          </Typography>
        </WhiteCard>
      ) : (
        children.map(({ child, progress, payment }) => {
          const isPaid = progress?.is_paid ?? false

          const paidAmount = progress?.paid_amount ?? 'xxx'
          const requiredAmount = progress?.required_amount_per_child ?? 'xxx'

          return (
            <WhiteCard key={child.id}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                {/* Child information */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <AppAvatar
                    name={fullName(child)}
                    src={child.avatar_url}
                    size={48}
                  />

                  <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {fullName(child)}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {payment
                        ? `${formatDate(payment.paid_at)} · ${formatMoney(paidAmount)}`
                        : `No payment yet · Required: ${formatMoney(requiredAmount)}`}
                    </Typography>
                  </Stack>
                </Stack>

                {/* Payment status and actions */}
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {isPaid ? (
                    <>
                      <Box sx={{ alignSelf: 'center', display: 'flex' }}>
                        <StatusBadge tone="success">Paid</StatusBadge>
                      </Box>

                      <AppButtonOutlined
                        label="Withdraw payment"
                        onClick={() => payment && onWithdraw(payment.id)}
                        disabled={!payment}
                      />
                    </>
                  ) : (
                    <>
                      <AppButton label="Pay" onClick={() => onPay(child.id)} />
                    </>
                  )}
                </Stack>
              </Stack>
            </WhiteCard>
          )
        })
      )}
    </Stack>
  )
}
