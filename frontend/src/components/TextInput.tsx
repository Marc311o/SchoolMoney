import { useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { IconButton, InputAdornment, TextField } from '@mui/material'

import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'

interface TextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  icon?: ReactNode
  fullWidth?: boolean
  disabled?: boolean
  name?: string
  password?: boolean
  error?: boolean
  errorText?: string
  label?: string
  ariaLabel?: string
  multiline?: boolean
  maxRows?: number
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void
}

export default function TextInput({
  value,
  onChange,
  placeholder = '...',
  icon,
  fullWidth = true,
  disabled = false,
  name,
  password = false,
  error = false,
  errorText,
  label = '',
  ariaLabel,
  multiline = false,
  maxRows,
  onKeyDown,
}: TextInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  const hasError = error || Boolean(errorText)
  const inputType = password && !showPassword ? 'password' : 'text'

  return (
    <TextField
      label={label}
      name={name}
      type={inputType}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      fullWidth={fullWidth}
      disabled={disabled}
      variant="outlined"
      size="small"
      error={hasError}
      helperText={errorText || undefined}
      multiline={multiline}
      maxRows={maxRows}
      onKeyDown={onKeyDown}
      slotProps={{
        htmlInput: ariaLabel ? { 'aria-label': ariaLabel } : undefined,
        formHelperText: {
          sx: {
            mx: 0,
            mt: 0.75,
            fontSize: 12,
            lineHeight: 1.4,
          },
        },
        input: {
          startAdornment: icon ? (
            <InputAdornment position="start">{icon}</InputAdornment>
          ) : undefined,

          endAdornment: password ? (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((previous) => !previous)}
                edge="end"
                size="small"
                disabled={disabled}
                sx={{
                  color: hasError ? 'error.main' : 'primary.dark',
                }}
              >
                {showPassword ? (
                  <VisibilityOffRoundedIcon fontSize="small" />
                ) : (
                  <VisibilityRoundedIcon fontSize="small" />
                )}
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',

          '& fieldset': {
            borderColor: hasError ? 'error.main' : 'divider',
          },

          '&:hover fieldset': {
            borderColor: hasError ? 'error.main' : 'primary.dark',
          },

          '&.Mui-focused fieldset': {
            borderColor: hasError ? 'error.main' : 'primary.dark',
          },

          '& .MuiInputAdornment-root': {
            color: hasError ? 'error.main' : 'primary.dark',
          },
        },

        '& .MuiInputBase-input::placeholder': {
          color: 'primary.dark',
          opacity: 0.65,
        },

        '& .MuiInputBase-input': {
          fontSize: 14,
          py: 1.25,
        },
        '& .MuiInputBase-multiline': {
          py: 1.25,

          '& .MuiInputBase-input': {
            py: 0,
          },
        },

        '& .MuiFormHelperText-root.Mui-error': {
          color: 'error.main',
        },
      }}
    />
  )
}
