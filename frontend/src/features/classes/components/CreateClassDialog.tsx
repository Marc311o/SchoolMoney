import { useState } from 'react'

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'

import { type SchoolClassCreate } from '@/features/classes/api'
import { type ApiError, getFieldErrors } from '@/lib/api'

interface CreateClassDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (payload: SchoolClassCreate) => void
  loading?: boolean
  error?: ApiError | null
}

type ClassErrors = {
  name?: string
  school_name?: string
  school_year?: string
  append_school_year?: string
  general?: string
}

function serverErrors(error: ApiError): ClassErrors {
  if (error.status === 422) {
    return getFieldErrors(error)
  }

  return {
    general: 'Something went wrong. Please try again.',
  }
}

export default function CreateClassDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
}: CreateClassDialogProps) {
  const [name, setName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [appendSchoolYear, setAppendSchoolYear] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const apiErrors = error ? serverErrors(error) : {}

  const nameError =
    submitted && !name.trim()
      ? 'Class name is required.'
      : appendSchoolYear && name.trim().length > 90
        ? 'Class name must be at most 90 characters.'
        : apiErrors.name

  const schoolYearError = (() => {
    if (submitted && appendSchoolYear && !schoolYear) {
      return 'School year is required when appending it to the class name.'
    }

    if (schoolYear) {
      const match = /^(\d{4})\/(\d{4})$/.exec(schoolYear)

      if (!match) {
        return 'Use the format YYYY/YYYY.'
      }

      const start = Number(match[1])
      const end = Number(match[2])

      if (start < 1 || start > 9998 || end !== start + 1) {
        return 'Enter two consecutive years, e.g. 2026/2027.'
      }
    }

    return apiErrors.school_year
  })()

  const handleClose = () => {
    if (loading) return

    setName('')
    setSchoolName('')
    setSchoolYear('')
    setAppendSchoolYear(false)
    setSubmitted(false)

    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (
      !name.trim() ||
      (appendSchoolYear && !schoolYear) ||
      (appendSchoolYear && name.trim().length > 90) ||
      (schoolYear && !/^([1-9]\d{0,3})\/(\d{4})$/.test(schoolYear)) ||
      (schoolYear &&
        Number(schoolYear.split('/')[1]) !==
          Number(schoolYear.split('/')[0]) + 1)
    ) {
      return
    }

    onConfirm({
      name: name.trim(),
      school_name: schoolName.trim() || null,
      school_year: schoolYear || null,
      append_school_year: appendSchoolYear,
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Create class</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextInput
            label="Class name"
            placeholder="e.g. Class 3A"
            value={name}
            onChange={setName}
            error={!!nameError}
            errorText={nameError}
            disabled={loading}
          />

          <TextInput
            label="School name (optional)"
            placeholder="e.g. Primary School No. 1"
            value={schoolName}
            onChange={setSchoolName}
            disabled={loading}
          />

          <TextInput
            label="School year (optional)"
            placeholder="2026/2027"
            value={schoolYear}
            onChange={setSchoolYear}
            error={!!schoolYearError}
            errorText={schoolYearError}
            disabled={loading}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={appendSchoolYear}
                onChange={(event) => setAppendSchoolYear(event.target.checked)}
                disabled={loading}
              />
            }
            label="Append school year to class name"
          />

          {appendSchoolYear && (
            <Typography variant="caption" color="text.secondary">
              The class name will look like: {name.trim() || 'Class name'}_
              {schoolYear || '2026/2027'}
            </Typography>
          )}

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
          label="Create class"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
