import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormHelperText,
} from '@mui/material'

import type { SelectChangeEvent } from '@mui/material'

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label?: string
  fullWidth?: boolean
  disabled?: boolean
  error?: boolean
  errorText?: string
  name?: string
  allowEmpty?: boolean
  emptyLabel?: string
}

export default function SelectInput({
  value,
  onChange,
  options,
  label = '',
  fullWidth = true,
  disabled = false,
  error = false,
  errorText,
  name,
  allowEmpty = false,
  emptyLabel = 'None',
}: SelectInputProps) {
  const hasError = error || Boolean(errorText)
  const labelId = `${name || 'select'}-label`

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value)
  }

  return (
    <FormControl
      fullWidth={fullWidth}
      disabled={disabled}
      error={hasError}
      size="small"
    >
      {label && (
        <InputLabel
          id={labelId}
          shrink
          sx={{
            backgroundColor: 'background.paper',
            px: 0.5,
            maxWidth: 'calc(100% - 32px)',
          }}
        >
          {label}
        </InputLabel>
      )}

      <Select
        labelId={labelId}
        name={name}
        value={value}
        onChange={handleChange}
        label={label || undefined}
        displayEmpty
        notched
        sx={{
          borderRadius: 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          fontSize: 14,

          '& .MuiSelect-select': {
            py: 1.25,
          },

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: hasError ? 'error.main' : 'divider',
          },

          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: hasError ? 'error.main' : 'primary.dark',
          },

          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: hasError ? 'error.main' : 'primary.dark',
          },

          '& .MuiSelect-icon': {
            color: hasError ? 'error.main' : 'primary.dark',
          },
        }}
        MenuProps={{
          slotProps: {
            paper: {
              sx: {
                borderRadius: 1,
                mt: 0.5,

                '& .MuiMenuItem-root': {
                  fontSize: 14,
                  minHeight: 40,
                },
              },
            },
          },
        }}
      >
        {allowEmpty && (
          <MenuItem value="">
            <em>{emptyLabel}</em>
          </MenuItem>
        )}

        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>

      {errorText && (
        <FormHelperText
          sx={{
            mx: 0,
            mt: 0.75,
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          {errorText}
        </FormHelperText>
      )}
    </FormControl>
  )
}
