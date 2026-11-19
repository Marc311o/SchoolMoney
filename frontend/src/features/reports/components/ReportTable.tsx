import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'

import type { ReportRow, ReportScope } from '@/features/reports/api'
import { formatMoney } from '@/lib/money'
import EmptyState from '@/components/EmptyState'

interface ReportTableProps {
  rows: ReportRow[]
  scope: ReportScope
}

export default function ReportTable({ rows, scope }: ReportTableProps) {
  const showAccount = scope === 'class' || scope === 'system'

  const moneyCellSx = {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  }

  if (!rows.length) {
    return <EmptyState description="No report data available." dashed />
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>
              {scope === 'fundraiser'
                ? 'Child'
                : scope === 'system'
                  ? 'Class'
                  : 'Fundraiser'}
            </TableCell>
            <TableCell align="right">Expected</TableCell>
            <TableCell align="right">Paid</TableCell>
            <TableCell align="right">Refunded</TableCell>
            <TableCell align="right">Net paid</TableCell>

            {showAccount && (
              <>
                <TableCell align="right">Balance</TableCell>
                <TableCell align="right">Deposited</TableCell>
                <TableCell align="right">Withdrawn</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>

              <TableCell align="right" sx={moneyCellSx}>
                {formatMoney(row.contributions.expected_total)}
              </TableCell>

              <TableCell align="right" sx={moneyCellSx}>
                {formatMoney(row.contributions.paid_total)}
              </TableCell>

              <TableCell align="right" sx={moneyCellSx}>
                {formatMoney(row.contributions.refunded_total)}
              </TableCell>

              <TableCell align="right" sx={moneyCellSx}>
                {formatMoney(row.contributions.net_paid_total)}
              </TableCell>

              {showAccount && (
                <>
                  <TableCell align="right" sx={moneyCellSx}>
                    {formatMoney(row.account?.current_balance ?? '0')}
                  </TableCell>

                  <TableCell align="right" sx={moneyCellSx}>
                    {formatMoney(row.account?.treasurer_deposited_total ?? '0')}
                  </TableCell>

                  <TableCell align="right" sx={moneyCellSx}>
                    {formatMoney(row.account?.treasurer_withdrawn_total ?? '0')}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
