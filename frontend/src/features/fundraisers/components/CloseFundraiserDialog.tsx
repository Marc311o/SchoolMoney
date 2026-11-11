import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Stack,
  Box,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'

interface CloseFundraiserDialogProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function CloseFundraiserDialog({
  open,
  loading,
  onClose,
  onConfirm,
}: CloseFundraiserDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Close fundraiser</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Typography>
            Are you sure you want to close this fundraiser?
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 600 }}>
                What happens next?
              </Typography>

              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                • The fundraiser will stop accepting payments.
              </Typography>

              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                • Remaining funds will be automatically refunded to parents who
                made payments.
              </Typography>

              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                • The fundraiser cannot be reopened.
              </Typography>
            </Stack>
          </Box>

          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            This action cannot be undone.
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
          label="Close fundraiser"
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
