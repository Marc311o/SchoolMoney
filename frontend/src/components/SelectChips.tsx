import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export interface SelectChipOption<T extends string> {
  label: string
  value: T
}

interface SelectChipsProps<T extends string> {
  options: SelectChipOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  fullWidth?: boolean
}

export default function SelectChips<T extends string>({
  options,
  value,
  onChange,
  label,
  fullWidth = true,
}: SelectChipsProps<T>) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, newValue: T | null) => {
        if (newValue !== null) onChange(newValue)
      }}
      aria-label={label}
      sx={{
        display: fullWidth ? 'flex' : 'inline-flex',
        gap: 0.5,
        p: 0.5,
        bgcolor: 'background.default',
        borderRadius: '10px',

        '& .MuiToggleButtonGroup-grouped': {
          flex: fullWidth ? 1 : 'none',
          minWidth: 0,
          minHeight: 34,
          m: 0,
          px: 1.5,
          py: 0.5,
          border: 0,
          borderRadius: '8px',
          color: 'text.secondary',
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.4,
          textTransform: 'none',
          whiteSpace: 'nowrap',

          '&:hover': {
            bgcolor: 'action.hover',
          },

          '&.Mui-selected, &.Mui-selected:hover': {
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
          },

          '&.Mui-focusVisible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: -2,
          },
        },
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.value} value={option.value}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
