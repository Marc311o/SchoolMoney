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

import {
  type FundraiserPayment,
  type FundraiserChildProgress,
} from '@/features/fundraisers/api'

import { type ClassMemberWithParent } from '@/features/classes/api'

import { fullName, shortName } from '@/lib/names'

interface FundraiserPaymentsProps {
  payments: FundraiserPayment[]
  members: ClassMemberWithParent[]
  childrenProgress: FundraiserChildProgress[]
  loading: boolean
  actionsEnabled: boolean
  onPay: (childId: string) => void
}

type PaymentFilter = 'all' | 'paid' | 'unpaid'

type PaymentRow = {
  id: string
  child: ClassMemberWithParent['child']
  payment: FundraiserPayment | null
}

function formatDate(value: string) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default function FundraiserPayments({
  payments,
  members,
  childrenProgress,
  loading,
  actionsEnabled,
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

  if (childrenProgress.length === 0) {
    return (
      <EmptyState
        dashed
        description="No children are participating in this fundraiser."
      />
    )
  }

  const rows = childrenProgress.flatMap<PaymentRow>((progress) => {
    const member = members.find((item) => item.child.id === progress.child_id)

    if (!member) return []

    const childPayments = payments
      .filter((payment) => payment.child_id === progress.child_id)
      .sort(
        (a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime(),
      )

    if (childPayments.length === 0) {
      return [
        {
          id: progress.child_id,
          child: member.child,
          payment: null,
        },
      ]
    }

    return childPayments.map((payment) => ({
      id: payment.id,
      child: member.child,
      payment,
    }))
  })

  const sortedRows = [...rows].sort((a, b) => {
    if (!a.payment && !b.payment) {
      return fullName(a.child).localeCompare(fullName(b.child))
    }

    if (!a.payment) return 1
    if (!b.payment) return -1

    return (
      new Date(b.payment.paid_at).getTime() -
      new Date(a.payment.paid_at).getTime()
    )
  })

  const filteredRows = sortedRows.filter(({ payment }) => {
    const isPaid = payment !== null && payment.refunded_at === null

    if (filter === 'paid') return isPaid
    if (filter === 'unpaid') return !isPaid

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
              {visibleRows.map(({ id, child, payment }) => {
                const payer = payment
                  ? members.find((item) => item.parent.id === payment.payer_id)
                  : null

                const refunded = payment?.refunded_at != null

                return (
                  <TableRow
                    key={id}
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
                      {!payment || refunded ? (
                        <StatusBadge tone="warning">Unpaid</StatusBadge>
                      ) : payer ? (
                        compact ? (
                          shortName(payer.parent)
                        ) : (
                          fullName(payer.parent)
                        )
                      ) : (
                        'Unknown parent'
                      )}
                    </TableCell>

                    <TableCell
                      sx={{ display: { xs: 'none', md: 'table-cell' } }}
                    >
                      {payment && !refunded ? formatDate(payment.paid_at) : ''}
                    </TableCell>

                    <TableCell align="right">
                      {payment && !refunded ? (
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            fontSize: 15,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {formatMoney(payment.amount)}
                        </Typography>
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
