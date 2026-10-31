import { useEffect, useState } from 'react'

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

import type { Child, ChildUpdate } from '@/features/children/api'
import { type ApiError, getFieldErrors } from '@/lib/api'

interface EditChildDialogProps {
  open: boolean
  child: Child | null
  onClose: () => void
  onConfirm: (data: ChildUpdate) => void
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
    return getFieldErrors(error) as ChildErrors
  }

  return {
    general: 'Something went wrong. Please try again.',
  }
}

export default function EditChildDialog({
  open,
  child,
  onClose,
  onConfirm,
  loading = false,
  error,
}: EditChildDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const [submitted, setSubmitted] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    if (open && child) {
      setFirstName(child.first_name ?? '')
      setLastName(child.last_name ?? '')
      setBirthDate(child.birth_date ?? '')
      setSubmitted(false)
    }
  }, [open, child])

  const apiErrors: ChildErrors = error ? serverErrors(error) : {}

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
      !child ||
      !firstName.trim() ||
      !lastName.trim() ||
      !birthDate ||
      birthDate > today
    ) {
      return
    }

    const data: ChildUpdate = {}

    if (firstName.trim() !== child.first_name) {
      data.first_name = firstName.trim()
    }

    if (lastName.trim() !== child.last_name) {
      data.last_name = lastName.trim()
    }

    if (birthDate !== child.birth_date) {
      data.birth_date = birthDate
    }

    // Nothing changed
    if (Object.keys(data).length === 0) {
      handleClose()
      return
    }

    onConfirm(data)
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Edit child</DialogTitle>

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
            Make sure the child's details are correct. Their class and
            fundraiser history will remain associated with their account.
          </Typography>

          {apiErrors.general && (
            <Typography color="error" variant="body2">
              {apiErrors.general}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={handleClose} />

        <AppButton
          label="Save changes"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
