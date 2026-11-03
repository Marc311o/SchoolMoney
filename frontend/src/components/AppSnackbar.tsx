import { Alert, Snackbar } from '@mui/material'

export type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning'
export type SnackbarVariant = 'filled' | 'standard' | 'outlined'

interface AppSnackbarProps {
  open: boolean
  message: string
  severity?: SnackbarSeverity
  variant?: SnackbarVariant
  onClose: () => void
  autoHideDuration?: number
}

export default function AppSnackbar({
  open,
  message,
  severity = 'success',
  variant = 'filled',
  onClose,
  autoHideDuration = 3000,
}: AppSnackbarProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={(_, reason) => {
        if (reason === 'clickaway') return
        onClose()
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        variant={variant}
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
