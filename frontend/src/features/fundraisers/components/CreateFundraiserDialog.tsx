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

import { type FundraiserCreate } from '@/features/fundraisers/api'
import { type ApiError, getFieldErrors } from '@/lib/api'

interface CreateFundraiserDialogProps {
  open: boolean
  classId: string
  onClose: () => void
  onConfirm: (payload: FundraiserCreate) => void
  loading?: boolean
  error?: ApiError | null
}

type FundraiserErrors = {
  name?: string
  description?: string
  logo_url?: string
  required_amount_per_child?: string
  start_date?: string
  end_date?: string
  general?: string
}

function serverErrors(error: ApiError): FundraiserErrors {
  if (error.status === 422) {
    return getFieldErrors(error)
  }

  if (error.status === 404) {
    return { general: 'Class not found or you do not have permission.' }
  }

  return {
    general: 'Could not create fundraiser. Please try again.',
  }
}

function todayString() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function sanitizeAmount(value: string): string {
  let sanitized = value.replace(/[^\d.]/g, '')
  const parts = sanitized.split('.')

  if (parts.length > 2) {
    sanitized = `${parts[0]}.${parts.slice(1).join('')}`
  }

  let [integer, decimal] = sanitized.split('.')
  integer = integer.replace(/^0+(?=\d)/, '')

  if (integer === '') {
    integer = '0'
  }
  return decimal === undefined ? integer : `${integer}.${decimal.slice(0, 2)}`
}

export default function CreateFundraiserDialog({
  open,
  classId,
  onClose,
  onConfirm,
  loading = false,
  error,
}: CreateFundraiserDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [amount, setAmount] = useState('')
  const [startDate, setStartDate] = useState(todayString)
  const [endDate, setEndDate] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const apiErrors = error ? serverErrors(error) : {}

  const amountNumber = Number(amount.replace(',', '.'))

  const nameError =
    submitted && !name.trim() ? 'Fundraiser name is required.' : apiErrors.name

  const amountError =
    submitted &&
    (!amount.trim() || !Number.isFinite(amountNumber) || amountNumber <= 0)
      ? 'Enter an amount greater than zero.'
      : apiErrors.required_amount_per_child

  const startDateError =
    submitted && !startDate ? 'Start date is required.' : apiErrors.start_date

  const endDateError =
    submitted && !endDate
      ? 'End date is required.'
      : startDate && endDate && endDate < startDate
        ? 'End date must be on or after start date.'
        : apiErrors.end_date

  const handleClose = () => {
    if (loading) return

    setName('')
    setDescription('')
    setLogoUrl('')
    setAmount('')
    setStartDate(todayString())
    setEndDate('')
    setSubmitted(false)

    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (
      !name.trim() ||
      !amount.trim() ||
      !Number.isFinite(amountNumber) ||
      amountNumber <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.')) ||
      !startDate ||
      !endDate ||
      endDate < startDate
    ) {
      return
    }

    onConfirm({
      class_id: classId,
      name: name.trim(),
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
      required_amount_per_child: amountNumber.toFixed(2),
      start_date: startDate,
      end_date: endDate,
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Create fundraiser</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextInput
            label="Fundraiser name"
            placeholder="e.g. Class trip 2027"
            value={name}
            onChange={setName}
            error={!!nameError}
            errorText={nameError}
            disabled={loading}
          />

          <TextInput
            label="Description (optional)"
            placeholder="What is this fundraiser for?"
            value={description}
            onChange={setDescription}
            disabled={loading}
          />

          <TextInput
            label="Required amount per child"
            placeholder="e.g. 100.00"
            value={amount}
            onChange={(value) => setAmount(sanitizeAmount(value))}
            disabled={loading}
            error={!!amountError}
            errorText={amountError}
          />

          <TextField
            fullWidth
            label="Start date"
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value)

              if (endDate && endDate < event.target.value) {
                setEndDate('')
              }
            }}
            disabled={loading}
            error={!!startDateError}
            helperText={startDateError}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: todayString() },
            }}
            size="small"
          />

          <TextField
            fullWidth
            label="End date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            disabled={loading || !startDate}
            error={!!endDateError}
            helperText={endDateError}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: startDate || todayString(),
              },
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
          label="Create fundraiser"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
