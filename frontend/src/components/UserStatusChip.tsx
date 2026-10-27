import { Chip } from '@mui/material'

interface UserStatusChipProps {
  label: string
}

export default function UserStatusChip({ label }: UserStatusChipProps) {
  return (
    <Chip
      label={label}
      variant="outlined"
      sx={{
        bgcolor: 'warning.light',
        color: 'warning.main',
        borderColor: 'divider',

        borderRadius: 2,
        fontWeight: 'bold',
        fontSize: 13,

        '&:hover': {
          bgcolor: 'warning.light',
          borderColor: 'divider',
        },

        // Stan disabled
        '&.Mui-disabled': {
          opacity: 0.5,
          color: 'text.secondary',
          borderColor: 'divider',
        },
      }}
    />
  )
}
