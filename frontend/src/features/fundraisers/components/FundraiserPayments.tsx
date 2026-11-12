import { useState } from 'react'

import {
  Box,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import SelectChips from '@/components/SelectChips'

import { formatMoney } from '@/lib/money'
import { fullName, shortName } from '@/lib/names'

import type { FundraiserChildItem } from '@/features/fundraisers/api'

interface FundraiserPaymentsProps {
  items: FundraiserChildItem[]
  loading: boolean
  actionsEnabled: boolean
  isClosed: boolean
  onPay: (childId: string) => void
}

type PaymentFilter = 'all' | 'paid' | 'unpaid' | 'refunded'

function formatDate(value: string | null) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default function FundraiserPayments({
  items,
  loading,
  actionsEnabled,
  isClosed,
  onPay,
}: FundraiserPaymentsProps) {
  const FUNDRAISER_CHILDREN_LIMIT = 5

  const [filter, setFilter] = useState<PaymentFilter>('all')
  const [showAll, setShowAll] = useState(false)

  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))

  if (loading) {
    return <CircularProgress />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        dashed
        description="No children are participating in this fundraiser."
      />
    )
  }

  const sortedRows = [...items].sort((a, b) => {
    const aPaid = a.payment_status === 'PAID'
    const bPaid = b.payment_status === 'PAID'

    if (!aPaid && !bPaid) {
      return fullName(a.child).localeCompare(fullName(b.child))
    }

    if (!aPaid) return 1
    if (!bPaid) return -1

    return (
      new Date(b.payment.paid_at ?? 0).getTime() -
      new Date(a.payment.paid_at ?? 0).getTime()
    )
  })

  const filteredRows = sortedRows.filter((item) => {
    if (filter === 'paid') return item.payment_status === 'PAID'
    if (filter === 'unpaid') return item.payment_status === 'UNPAID'
    if (filter === 'refunded') return item.payment_status === 'REFUNDED'

    return true
  })

  const visibleRows = showAll
    ? filteredRows
    : filteredRows.slice(0, FUNDRAISER_CHILDREN_LIMIT)

  return (
    <WhiteCard>
      <Stack spacing={2}>
        <Box sx={{ width: '100%' }}>
          <SelectChips<PaymentFilter>
            label="Payment filter"
            options={[
              { label: 'Show all', value: 'all' },
              { label: 'Only paid', value: 'paid' },
              { label: 'Only unpaid', value: 'unpaid' },
              ...(isClosed
                ? [{ label: 'Only refunded', value: 'refunded' as const }]
                : []),
            ]}
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setShowAll(false)
            }}
            fullWidth
          />
        </Box>

        <TableContainer sx={{ px: 0 }}>
          <Table
            size="small"
            sx={{
              '& th, & td': {
                height: 48,
                boxSizing: 'border-box',
                py: 0,
              },
              '& th:first-of-type, & td:first-of-type': { pl: 0 },
              '& th:last-of-type, & td:last-of-type': { pr: 0 },
            }}
          >
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    borderBottom: 2,
                    borderColor: 'divider',
                    fontWeight: 700,
                  },
                }}
              >
                <TableCell>Child</TableCell>
                <TableCell>Paid by</TableCell>

                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  Date
                </TableCell>

                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {visibleRows.map((item) => {
                const { child, payment } = item

                const isPaid = item.payment_status === 'PAID'
                const isRefunded = item.payment_status === 'REFUNDED'

                const payer = payment.payer

                return (
                  <TableRow
                    key={child.id}
                    sx={{
                      backgroundColor: 'transparent',
                      '& td': {
                        borderBottom: 1,
                        borderColor: 'divider',
                      },
                      '&:last-child td': {
                        borderBottom: 0,
                      },
                    }}
                  >
                    <TableCell>{fullName(child)}</TableCell>

                    <TableCell>
                      {isPaid && payer ? (
                        compact ? (
                          shortName(payer)
                        ) : (
                          fullName(payer)
                        )
                      ) : isRefunded ? (
                        <StatusBadge tone="warning">Refunded</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">Unpaid</StatusBadge>
                      )}
                    </TableCell>

                    <TableCell
                      sx={{
                        display: { xs: 'none', md: 'table-cell' },
                      }}
                    >
                      {isPaid ? formatDate(payment.paid_at) : ''}
                    </TableCell>

                    <TableCell align="right">
                      {isPaid ? (
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            fontSize: 15,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatMoney(payment.amount ?? '0')}
                        </Typography>
                      ) : isRefunded ? (
                        '—'
                      ) : actionsEnabled ? (
                        <AppButtonOutlined
                          label="Pay for"
                          onClick={() => onPay(child.id)}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}

              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography sx={{ color: 'text.secondary', py: 3 }}>
                      No payments found for this filter.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {filteredRows.length > FUNDRAISER_CHILDREN_LIMIT && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <AppButtonOutlined
              label={
                showAll ? 'Show less' : `Show all (${filteredRows.length})`
              }
              onClick={() => setShowAll((prev) => !prev)}
            />
          </Box>
        )}
      </Stack>
    </WhiteCard>
  )
}
