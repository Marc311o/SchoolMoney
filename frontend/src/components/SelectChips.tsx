import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export interface SelectChipOption {
  label: string
  value: string
}

interface SelectChipsProps {
  options: SelectChipOption[]
  value: string | null
  onChange: (value: string | null) => void
  color?: 'standard' | 'primary' | 'secondary'
  size?: 'small' | 'medium' | 'large'
}

export default function SelectChips({
  options,
  value,
  onChange,
  color = 'primary',
  size = 'small',
}: SelectChipsProps) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      color={color}
      size={size}
      onChange={(_, newValue: string | null) => onChange(newValue)}
      aria-label="Select one option"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1,
        width: '100%',

        '& .MuiToggleButtonGroup-grouped': {
          flex: 1,
          minWidth: 0,
          px: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          textTransform: 'none',

          // Unselected
          bgcolor: 'divider',
          color: '#000000',
          fontWeight: 600,

          '&:hover': {
            bgcolor: 'action.hover',
          },

          // Selected
          '&.Mui-selected': {
            bgcolor: 'text.secondary',
            color: '#FFFFFF',
            fontWeight: 600,

            '&:hover': {
              bgcolor: 'text.secondary',
            },
          },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton
          key={option.value}
          value={option.value}
          aria-label={option.label}
        >
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
