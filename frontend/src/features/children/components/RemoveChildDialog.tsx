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

import { type ApiError } from '@/lib/api'
import { isRemoveBlocked } from '@/features/children/api'

interface RemoveChildDialogProps {
  open: boolean
  firstName: string
  lastName: string
  className: string | null
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
  error?: ApiError | null
}

export default function RemoveChildDialog({
  open,
  firstName,
  lastName,
  className,
  onClose,
  onConfirm,
  loading = false,
  error,
}: RemoveChildDialogProps) {
  const blocked = error && isRemoveBlocked(error)

  const errorMessage = blocked
    ? error.message
    : error
      ? 'Something went wrong. Please try again.'
      : null

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Remove {firstName}?</DialogTitle>

      <DialogContent>
        <Stack spacing={1}>
          <Typography color="text.secondary">
            {firstName} {lastName} leaves class {className ?? 'not assigned'}{' '}
            and won't be counted in its fundraisers.
          </Typography>

          <Typography color="text.secondary">
            Payments you already made stay in your wallet history.
          </Typography>

          {errorMessage && (
            <Typography color="error" variant="body2">
              {errorMessage}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined
          label="Cancel"
          onClick={onClose}
          disabled={loading}
        />

        <AppButtonError
          label="Remove"
          onClick={onConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
