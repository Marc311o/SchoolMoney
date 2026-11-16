import { Box, Stack, Typography } from '@mui/material'

import PageSection from '@/components/PageSection'
import WhiteCard from '@/components/WhiteCard'

import { formatMoney } from '@/lib/money'

import type { ContributionTotals } from '@/features/reports/api'

interface ReportFinancialSummaryProps {
  contributions: ContributionTotals
}

const ITEMS = [
  {
    key: 'expected_total',
    label: 'Expected',
    color: 'text.primary',
  },
  {
    key: 'paid_total',
    label: 'Paid',
    color: 'success.main',
  },
  {
    key: 'refunded_total',
    label: 'Refunded',
    color: 'error.main',
  },
  {
    key: 'net_paid_total',
    label: 'Net paid',
    color: 'text.primary',
  },
] as const

export default function ReportFinancialSummary({
  contributions,
}: ReportFinancialSummaryProps) {
  return (
    <PageSection title="Financial summary">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
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
                  overflowWrap: 'anywhere',
                  color: item.color,
                }}
              >
                {formatMoney(contributions[item.key])}
              </Typography>
            </Stack>
          </WhiteCard>
        ))}
      </Box>
    </PageSection>
  )
}
