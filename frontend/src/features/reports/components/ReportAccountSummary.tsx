import { Box, Stack, Typography } from '@mui/material'

import PageSection from '@/components/PageSection'
import WhiteCard from '@/components/WhiteCard'
import { formatMoney } from '@/lib/money'

import type { AccountTotals } from '@/features/reports/api'

interface ReportAccountSummaryProps {
  account: AccountTotals
}

const ITEMS = [
  {
    key: 'current_balance',
    label: 'Current balance',
    color: 'text.primary',
  },
  {
    key: 'treasurer_deposited_total',
    label: 'Deposited',
    color: 'success.main',
  },
  {
    key: 'treasurer_withdrawn_total',
    label: 'Withdrawn',
    color: 'error.main',
  },
] as const

export default function ReportAccountSummary({
  account,
}: ReportAccountSummaryProps) {
  return (
    <PageSection title="Account summary">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(3, minmax(0, 1fr))',
          },
          gap: 2,
        }}
      >
        {ITEMS.map((item) => (
          <WhiteCard key={item.key} padding={2.5}>
            <Stack spacing={1}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                {item.label}
              </Typography>

              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  overflowWrap: 'anywhere',
                  color: item.color,
                }}
              >
                {formatMoney(account[item.key])}
              </Typography>
            </Stack>
          </WhiteCard>
        ))}
      </Box>
    </PageSection>
  )
}
