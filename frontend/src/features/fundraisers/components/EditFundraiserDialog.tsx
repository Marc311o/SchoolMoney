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

import {
  type Fundraiser,
  type FundraiserUpdate,
} from '@/features/fundraisers/api'
import { type ApiError, getFieldErrors } from '@/lib/api'

interface EditFundraiserDialogProps {
  open: boolean
  fundraiser: Fundraiser
  onClose: () => void
  onConfirm: (payload: FundraiserUpdate) => void
  loading?: boolean
  error?: ApiError | null
}

type FundraiserErrors = {
  name?: string
  description?: string
  start_date?: string
  end_date?: string
  general?: string
}

function serverErrors(error: ApiError): FundraiserErrors {
  if (error.status === 422) {
    return getFieldErrors(error)
  }

  if (error.status === 409) {
    return {
      general: 'This fundraiser can no longer be edited.',
    }
  }

  if (error.status === 404) {
    return { general: 'Fundraiser not found or access denied.' }
  }

  return { general: 'Could not update fundraiser. Please try again.' }
}

export default function EditFundraiserDialog({
  open,
  fundraiser,
  onClose,
  onConfirm,
  loading = false,
  error,
}: EditFundraiserDialogProps) {
  const [name, setName] = useState(fundraiser.name)
  const [description, setDescription] = useState(fundraiser.description ?? '')
  const [startDate, setStartDate] = useState(fundraiser.start_date)
  const [endDate, setEndDate] = useState(fundraiser.end_date)
  const [submitted, setSubmitted] = useState(false)

  const apiErrors = error ? serverErrors(error) : {}

  const nameError =
    submitted && !name.trim() ? 'Fundraiser name is required.' : apiErrors.name

  const startDateError =
    submitted && !startDate ? 'Start date is required.' : apiErrors.start_date

  const endDateError =
    submitted && !endDate
      ? 'End date is required.'
      : startDate && endDate && endDate < startDate
        ? 'End date must be on or after start date.'
        : apiErrors.end_date

  const handleConfirm = () => {
    setSubmitted(true)

    if (!name.trim() || !startDate || !endDate || endDate < startDate) {
      return
    }

    onConfirm({
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate,
    })
  }

  const handleClose = () => {
    if (!loading) onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Edit fundraiser</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextInput
            label="Fundraiser name"
            value={name}
            onChange={setName}
            error={!!nameError}
            errorText={nameError}
            disabled={loading}
          />

          <TextInput
            label="Description (optional)"
            value={description}
            onChange={setDescription}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={loading}
            error={!!startDateError}
            helperText={startDateError}
            slotProps={{ inputLabel: { shrink: true } }}
            size="small"
          />

          <TextField
            fullWidth
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            disabled={loading}
            error={!!endDateError}
            helperText={endDateError}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: startDate },
            }}
            size="small"
          />

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
