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
import { formatMoney } from '@/lib/money'

interface RefundFundraiserDialogProps {
  open: boolean
  childName: string
  amount: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function RefundFundraiserDialog({
  open,
  childName,
  amount,
  loading,
  onClose,
  onConfirm,
}: RefundFundraiserDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>
        Confirm payment withdrawal
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            Are you sure you want to withdraw the payment made for {childName}?
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell
                      sx={{
                        pl: 0,
                        borderBottom: 0,
                        fontWeight: 700,
                      }}
                    >
                      Refund amount
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
                      {formatMoney(amount)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined
          label="Cancel"
          onClick={onClose}
          disabled={loading}
        />

        <AppButton
          label="Confirm withdrawal"
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
