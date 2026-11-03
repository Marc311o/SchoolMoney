import { useState } from 'react'

import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'
import SelectInput from '@/components/SelectInput'

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
  const [submitted, setSubmitted] = useState(false)

  const apiErrors = error ? serverErrors(error) : {}

  const nameError =
    submitted && !name.trim() ? 'Class name is required.' : apiErrors.name

  const schoolYearError = (() => {
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

  const currentYear = new Date().getFullYear()

  const schoolYears = Array.from({ length: 10 }, (_, index) => {
    const start = currentYear - 5 + index

    return {
      value: `${start}/${start + 1}`,
      label: `${start}/${start + 1}`,
    }
  })

  const handleClose = () => {
    if (loading) return

    setName('')
    setSchoolName('')
    setSchoolYear('')
    setSubmitted(false)

    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (
      !name.trim() ||
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

          <SelectInput
            label="School year (optional)"
            value={schoolYear}
            onChange={setSchoolYear}
            options={schoolYears}
            allowEmpty
            emptyLabel="No school year"
            disabled={loading}
            error={!!schoolYearError}
            errorText={schoolYearError}
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
          label="Create class"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
