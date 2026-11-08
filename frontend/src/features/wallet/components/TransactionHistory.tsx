import { useState } from 'react'
import type { Transaction } from '@/features/wallet/api'

import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Pagination,
  Paper,
  Stack,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material'

import { useTransactions } from '@/features/wallet/api'

interface TransactionHistoryProps {
  walletId: string
}

const formatAmount = (amount: string) =>
  new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
  }).format(Number(amount))

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))

const formatType = (type: string) =>
  type
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())

export function TransactionHistory({ walletId }: TransactionHistoryProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const { data, isPending, isError } = useTransactions(page, pageSize)

  if (isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return <Alert severity="error">Could not load transaction history.</Alert>
  }

  const isOutgoing = (transaction: Transaction) =>
    transaction.from_account_id === walletId

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h2">Transaction history</Typography>
            <Typography variant="body2" color="text.secondary">
              All transactions associated with your wallet.
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel id="page-size-label">Per page</InputLabel>
            <Select
              labelId="page-size-label"
              value={pageSize}
              label="Per page"
              onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}
            >
              {[5, 10, 15, 20].map((size) => (
                <MenuItem key={size} value={size}>
                  {size}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {data.items.length === 0 ? (
          <Typography
            color="text.secondary"
            sx={{ py: 3, textAlign: 'center' }}
          >
            No transactions yet.
          </Typography>
        ) : (
          <Stack divider={<Divider flexItem />} spacing={0}>
            {data.items.map((transaction) => {
              const outgoing = isOutgoing(transaction)

              return (
                <Box
                  key={transaction.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 2,
                    py: 2,
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {transaction.description || formatType(transaction.type)}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {formatType(transaction.type)} ·{' '}
                      {formatDate(transaction.created_at)}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      color: outgoing ? 'error.main' : 'success.main',
                    }}
                  >
                    {outgoing ? '−' : '+'}
                    {formatAmount(transaction.amount)}
                  </Typography>
                </Box>
              )
            })}
          </Stack>
        )}

        {data.pages > 1 && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Pagination
                count={data.pages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
              />
            </Box>
          </>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: 'right' }}
        >
          {data.total} transactions in total
        </Typography>
      </Stack>
    </Paper>
  )
}
