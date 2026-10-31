import { Button, CircularProgress } from '@mui/material'

interface AppButtonErrorProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export default function AppButtonError({
  label,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
}: AppButtonErrorProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      variant="contained"
      color="error"
      disabled={disabled || loading}
      fullWidth={fullWidth}
      disableElevation
      sx={{
        borderRadius: 1,
        fontWeight: 700,
        fontSize: 14,
        textTransform: 'none',
        minHeight: 40,
        px: 2.5,
      }}
    >
      {loading && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}

      {label}
    </Button>
  )
}
