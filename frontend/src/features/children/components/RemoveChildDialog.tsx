import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

import AppButtonOutlined from '@/components/AppButtonOutlined'
import AppButtonError from '@/components/AppButtonError'

interface RemoveChildDialogProps {
  open: boolean
  firstName: string
  lastName: string
  className: string | null
  onClose: () => void
  onConfirm: () => void
}

export default function RemoveChildDialog({
  open,
  firstName,
  lastName,
  className,
  onClose,
  onConfirm,
}: RemoveChildDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Remove {firstName}?</DialogTitle>

      <DialogContent>
        <Stack spacing={1}>
          <Typography color="text.secondary">
            {firstName} {lastName} leaves class {className} and won't be counted in its fundraisers.
          </Typography>

          <Typography color="text.secondary">
            Payments you already made stay in your wallet history.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={onClose} />
        <AppButtonError label="Remove" onClick={onConfirm} />
      </DialogActions>
    </Dialog>
  )
}
