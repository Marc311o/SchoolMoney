import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'

interface NoAvailableChildrenDialogProps {
  open: boolean
  onClose: () => void
  onGoToChildren: () => void
}

export default function NoAvailableChildrenDialog({
  open,
  onClose,
  onGoToChildren,
}: NoAvailableChildrenDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>No children available</DialogTitle>

      <DialogContent>
        <Stack spacing={1} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            To join a class, you first need to add a child to your account.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Once you have added your child, you can join their class using the
            access code provided by the class treasurer.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={onClose} />

        <AppButton label="Go to My children" onClick={onGoToChildren} />
      </DialogActions>
    </Dialog>
  )
}
