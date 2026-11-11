import { useState } from 'react'
import { CircularProgress, Stack, Typography } from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import EmptyState from '@/components/EmptyState'
import PageSection from '@/components/PageSection'
import { formatMoney } from '@/lib/money'
import type { TreasurerOperation } from '@/features/fundraisers/api'

interface FundraiserWithdrawalsProps {
  withdrawals: TreasurerOperation[]
  loading?: boolean
}

const ITEMS_LIMIT = 1

export default function FundraiserWithdrawals({
  withdrawals,
  loading = false,
}: FundraiserWithdrawalsProps) {
  const [showAll, setShowAll] = useState(false)

  const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    })
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Stack>
    )
  }

  const visibleWithdrawals = showAll
    ? withdrawals
    : withdrawals.slice(0, ITEMS_LIMIT)

  return (
    <PageSection
      title="Withdrawals"
      count={withdrawals.length}
      action={
        withdrawals.length > ITEMS_LIMIT ? (
          <AppButtonOutlined
            label={showAll ? 'Show less' : 'Show all'}
            onClick={() => setShowAll((prev) => !prev)}
          />
        ) : undefined
      }
    >
      {withdrawals.length === 0 ? (
        <EmptyState dashed description="No withdrawals yet." />
      ) : (
        <Stack spacing={1.5}>
          {visibleWithdrawals.map((withdrawal) => (
            <WhiteCard key={withdrawal.id}>
              <Stack spacing={0.25} sx={{ px: 1, py: 0.5 }}>
                <Stack
                  sx={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      color: 'text.primary',
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {withdrawal.description || 'Withdrawal to treasurer wallet'}
                  </Typography>

                  <Typography
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      color: 'text.primary',
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      ml: 'auto',
                    }}
                  >
                    -{formatMoney(withdrawal.amount)}
                  </Typography>
                </Stack>

                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                  {formatDate(withdrawal.created_at)}
                </Typography>
              </Stack>
            </WhiteCard>
          ))}
        </Stack>
      )}
    </PageSection>
  )
}
