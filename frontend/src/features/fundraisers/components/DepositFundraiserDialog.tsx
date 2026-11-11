import { useState } from 'react'

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'

import { formatMoney } from '@/lib/money'

interface DepositFundraiserDialogProps {
  open: boolean
  fundraiserBalance: string
  walletBalance: string
  walletLoading: boolean
  loading: boolean
  onClose: () => void
  onConfirm: (amount: string, description: string | null) => void
}

function sanitizeAmount(value: string): string {
  let sanitized = value.replace(/[^\d.]/g, '')
  const parts = sanitized.split('.')

  if (parts.length > 2) {
    sanitized = `${parts[0]}.${parts.slice(1).join('')}`
  }

  let [integer, decimal] = sanitized.split('.')
  integer = integer.replace(/^0+(?=\d)/, '')

  if (integer === '') {
    integer = '0'
  }

  return decimal === undefined ? integer : `${integer}.${decimal.slice(0, 2)}`
}

export default function DepositFundraiserDialog({
  open,
  fundraiserBalance,
  walletBalance,
  walletLoading,
  loading,
  onClose,
  onConfirm,
}: DepositFundraiserDialogProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const wallet = Number(walletBalance)
  const available = Number(fundraiserBalance)
  const amountValue = Number(amount)

  const amountError =
    submitted &&
    (!amount.trim() ||
      !Number.isFinite(amountValue) ||
      amountValue <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      amountValue > wallet)
      ? amountValue > wallet
        ? 'Amount exceeds your wallet balance.'
        : 'Enter a valid amount greater than zero.'
      : undefined

  const walletAfter = wallet - (Number.isFinite(amountValue) ? amountValue : 0)
  const fundraiserAfter =
    available + (Number.isFinite(amountValue) ? amountValue : 0)

  const handleClose = () => {
    if (loading) return

    setAmount('')
    setDescription('')
    setSubmitted(false)
    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (
      !amount.trim() ||
      !Number.isFinite(amountValue) ||
      amountValue <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount) ||
      amountValue > wallet
    ) {
      return
    }

    onConfirm(amountValue.toFixed(2), description.trim() || null)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Deposit to fundraiser</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Transfer money from your wallet to the fundraiser account.
          </Typography>

          <TextInput
            label="Amount"
            placeholder="e.g. 100.00"
            value={amount}
            onChange={(inputValue) => setAmount(sanitizeAmount(inputValue))}
            disabled={loading}
            error={!!amountError}
            errorText={amountError}
          />

          <TextInput
            label="Description (optional)"
            placeholder="Reason for deposit"
            value={description}
            onChange={setDescription}
            disabled={loading}
          />

          <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
              Balance summary
            </Typography>

            {walletLoading ? (
              <Typography color="text.secondary">Loading...</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 0, pl: 0 }}>
                        Your wallet balance
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          border: 0,
                          pl: 0,
                          fontFamily: 'monospace',
                          fontSize: 15,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {formatMoney(walletBalance)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ border: 0, pl: 0 }}>
                        After deposit
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          border: 0,
                          pl: 0,
                          fontFamily: 'monospace',
                          fontSize: 15,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'error.main',
                        }}
                      >
                        {formatMoney(walletAfter.toFixed(2))}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ border: 0, pl: 0 }}>
                        Fundraiser balance after deposit
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          border: 0,
                          pl: 0,
                          fontFamily: 'monospace',
                          fontSize: 15,
                          fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'success.main',
                        }}
                      >
                        {formatMoney(fundraiserAfter.toFixed(2))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined
          label="Cancel"
          onClick={handleClose}
          disabled={loading}
        />

        <AppButton
          label="Confirm deposit"
          onClick={handleConfirm}
          loading={loading}
          disabled={
            loading ||
            walletLoading ||
            !amount.trim() ||
            !Number.isFinite(amountValue) ||
            amountValue <= 0 ||
            !/^\d+(\.\d{1,2})?$/.test(amount) ||
            amountValue > wallet
          }
        />
      </DialogActions>
    </Dialog>
  )
}
