import { Button, CircularProgress } from '@mui/material'

interface AppButtonOutlinedProps {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export default function AppButtonOutlined({
  label,
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
}: AppButtonOutlinedProps) {
  return (
    <Button
      type={type}
      onClick={onClick}
      variant="outlined"
      disabled={disabled || loading}
      fullWidth={fullWidth}
      disableElevation
      sx={{
        bgcolor: 'primary.contrastText',
        color: 'primary.main',
        borderColor: 'primary.main',

        '&:hover': {
          bgcolor: 'primary.light',
          borderColor: 'primary.main',
        },

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
