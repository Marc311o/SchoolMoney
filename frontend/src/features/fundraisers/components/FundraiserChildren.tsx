import { Stack, Typography } from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import AppAvatar from '@/components/AppAvatar'
import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import StatusBadge from '@/components/StatusBadge'

import { fullName } from '@/lib/names'
import { formatMoney } from '@/lib/money'

import type { FundraiserChildItem } from '@/features/fundraisers/api'

interface FundraiserChildrenProps {
  items: FundraiserChildItem[]
  loading: boolean
  actionsEnabled: boolean
  onPay: (childId: string) => void
  onWithdraw: (paymentId: string) => void
}

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function FundraiserChildren({
  items,
  loading,
  actionsEnabled,
  onPay,
  onWithdraw,
}: FundraiserChildrenProps) {
  if (loading) {
    return <Typography color="text.secondary">Loading children...</Typography>
  }

  return (
    <Stack spacing={2}>
      {items.length === 0 ? (
        <WhiteCard>
          <Typography color="text.secondary">
            No children participated in this fundraiser.
          </Typography>
        </WhiteCard>
      ) : (
        items.map((item) => {
          const { child, payment, payment_status, refunded_amount } = item

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
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{ alignItems: 'center', flex: 1, minWidth: 0 }}
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

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: 'center',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {payment.paid_at
                          ? formatDate(payment.paid_at)
                          : 'No payment yet'}
                      </Typography>

                      {payment_status === 'REFUNDED' && (
                        <Typography variant="body2" color="text.secondary">
                          · Refunded: {formatMoney(refunded_amount)}
                        </Typography>
                      )}
                    </Stack>
                  </Stack>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {payment_status === 'PAID' && (
                    <>
                      <StatusBadge tone="success">Paid</StatusBadge>

                      {actionsEnabled && payment.id && (
                        <AppButtonOutlined
                          label="Withdraw payment"
                          onClick={() => onWithdraw(payment.id!)}
                        />
                      )}
                    </>
                  )}

                  {payment_status === 'REFUNDED' && (
                    <StatusBadge tone="warning">Refunded</StatusBadge>
                  )}

                  {payment_status === 'UNPAID' && actionsEnabled && (
                    <AppButton label="Pay" onClick={() => onPay(child.id)} />
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
