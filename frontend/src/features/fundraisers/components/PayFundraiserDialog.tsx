import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Box,
  TableCell,
  TableRow,
  TableBody,
  Table,
  TableContainer,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'

interface PayFundraiserDialogProps {
  open: boolean
  childName: string
  amount: string
  walletBalance: string
  walletLoading: boolean
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'PLN',
  }).format(Number(value))
}

function formatAmount(value: string | number) {
  return Number(value).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function PayFundraiserDialog({
  open,
  childName,
  amount,
  walletBalance,
  walletLoading,
  loading,
  onClose,
  onConfirm,
}: PayFundraiserDialogProps) {
  const balance = Number(walletBalance)
  const paymentAmount = Number(amount)

  const missingAmount = Math.max(paymentAmount - balance, 0)
  const hasInsufficientFunds = !walletLoading && missingAmount > 0

  const balanceAfterPayment = balance - paymentAmount

  // Insufficient funds dialog
  if (hasInsufficientFunds) {
    return (
      <Dialog
        open={open}
        onClose={loading ? undefined : onClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Insufficient funds</DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              You cannot pay for {childName} because you don't have enough money
              in your wallet.
            </Typography>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
                Wallet balance
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 0, pl: 0 }}>
                        Required amount
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
                        {formatAmount(paymentAmount)}
                      </TableCell>
                    </TableRow>

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
                        {formatAmount(balance)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell
                        sx={{
                          pl: 0,
                          borderBottom: 0,
                          fontWeight: 700,
                        }}
                      >
                        Missing amount
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
                        {formatMoney(missingAmount)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Please top up your wallet to complete this payment.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <AppButton label="Close" onClick={onClose} disabled={loading} />
        </DialogActions>
      </Dialog>
    )
  }

  // Payment confirmation dialog
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Confirm payment</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography>Are you sure you want to pay for {childName}?</Typography>

          {/* Wallet balance table */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Typography sx={{ fontWeight: 700, mb: 1.5 }}>
              Wallet balance
            </Typography>

            {walletLoading ? (
              <Typography color="text.secondary">Loading...</Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: 0, pl: 0 }}>
                        Before payment
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
                        {formatAmount(balance)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell sx={{ border: 0, pl: 0 }}>Payment</TableCell>

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
                        − {formatAmount(paymentAmount)}
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell
                        sx={{
                          pl: 0,
                          borderBottom: 0,
                          fontWeight: 700,
                        }}
                      >
                        After payment
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
                        {formatMoney(balanceAfterPayment)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary">
            The amount will be transferred from your wallet to the fundraiser
            account.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined
          label="Cancel"
          onClick={onClose}
          disabled={loading}
        />

        <AppButton
          label="Confirm payment"
          onClick={onConfirm}
          loading={loading}
          disabled={loading || walletLoading}
        />
      </DialogActions>
    </Dialog>
  )
}
