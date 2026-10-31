import { useState } from 'react'

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'
import AppAvatar from '@/components/AppAvatar'

import { type ChildCreate } from '@/features/children/api'
import { type ApiError, getFieldErrors } from '@/lib/api'

interface AddChildDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (child: ChildCreate) => void
  loading?: boolean
  error?: ApiError | null
}

type ChildErrors = {
  first_name?: string
  last_name?: string
  birth_date?: string
  general?: string
}

function serverErrors(error: ApiError): ChildErrors {
  if (error.status === 409) {
    return {
      general: 'A child with these details already exists.',
    }
  }

  if (error.status === 422) {
    return getFieldErrors(error)
  }

  return {
    general: 'Something went wrong. Please try again.',
  }
}

export default function AddChildDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
}: AddChildDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  const apiErrors = error ? serverErrors(error) : {}

  const firstNameError =
    submitted && !firstName.trim()
      ? 'First name is required'
      : apiErrors.first_name

  const lastNameError =
    submitted && !lastName.trim()
      ? 'Last name is required'
      : apiErrors.last_name

  const birthDateError =
    submitted && !birthDate
      ? 'Date of birth is required'
      : birthDate > today
        ? 'Date cannot be in the future'
        : apiErrors.birth_date

  const fullName = `${firstName} ${lastName}`.trim()

  const handleClose = () => {
    if (loading) return

    setFirstName('')
    setLastName('')
    setBirthDate('')
    setSubmitted(false)

    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !birthDate ||
      birthDate > today
    ) {
      return
    }

    onConfirm({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      birth_date: birthDate,
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Add child</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <AppAvatar name={fullName || 'A'} size={64} randomColor={false} />

          <Stack direction="row" spacing={2}>
            <TextInput
              label="First name"
              placeholder="First name"
              value={firstName}
              onChange={setFirstName}
              error={!!firstNameError}
              errorText={firstNameError}
              disabled={loading}
            />

            <TextInput
              label="Last name"
              placeholder="Last name"
              value={lastName}
              onChange={setLastName}
              error={!!lastNameError}
              errorText={lastNameError}
              disabled={loading}
            />
          </Stack>

          <TextField
            fullWidth
            label="Date of birth"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            error={!!birthDateError}
            helperText={birthDateError}
            disabled={loading}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: today },
            }}
            size="small"
          />

          <Typography variant="caption" color="text.secondary">
            Added a child you removed earlier? The same name and birth date
            bring back their history.
          </Typography>

          {apiErrors.general && (
            <Typography color="error" variant="body2" sx={{ fontSize: 14 }}>
              {String(apiErrors.general)}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={handleClose} />

        <AppButton
          label="Add child"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
