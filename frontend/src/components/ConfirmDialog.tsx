import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'

import AppButton from '@/components/AppButton.tsx'
import AppButtonError from '@/components/AppButtonError.tsx'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  /** Red confirm button, for actions that remove or break something */
  destructive?: boolean
  loading?: boolean
  /** Shown under the description, e.g. an API error */
  error?: string | null
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  loading = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ConfirmButton = destructive ? AppButtonError : AppButton

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>

      <DialogContent>
        <Typography component="div" color="text.secondary">
          {description}
        </Typography>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined
          label="Cancel"
          onClick={onClose}
          disabled={loading}
        />
        <ConfirmButton
          label={confirmLabel}
          onClick={onConfirm}
          loading={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
