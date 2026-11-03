import { Alert, Snackbar } from '@mui/material'

export type SnackbarSeverity = 'success' | 'error' | 'info' | 'warning'

interface AppSnackbarProps {
  open: boolean
  message: string
  severity?: SnackbarSeverity
  onClose: () => void
  autoHideDuration?: number
}

export default function AppSnackbar({
  open,
  message,
  severity = 'success',
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
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  )
}
