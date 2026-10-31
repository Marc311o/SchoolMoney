import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'

import {
  Avatar,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'

interface AddChildDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (child: {
    first_name: string
    last_name: string
    birth_date: string
    photo: File | null
  }) => void
}

export default function AddChildDialog({
  open,
  onClose,
  onConfirm,
}: AddChildDialogProps) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const [submitted, setSubmitted] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  const firstNameError = submitted && !firstName.trim()
  const lastNameError = submitted && !lastName.trim()
  const birthDateError = submitted && !birthDate

  const handleClose = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setFirstName('')
    setLastName('')
    setBirthDate('')
    setPhoto(null)
    setPhotoPreview(null)
    setSubmitted(false)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    onClose()
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
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
      photo,
    })

    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Add child</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {/* Child photo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              src={photoPreview ?? undefined}
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'action.hover',
                color: 'text.secondary',
                flexShrink: 0,
              }}
            >
              <PersonOutlineRoundedIcon fontSize="large" />
            </Avatar>

            <Box
              sx={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <AppButtonOutlined
                label="Add photo (optional)"
                onClick={() => fileInputRef.current?.click()}
              />
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePhotoChange}
            />
          </Box>

          {/* First name and last name */}
          <Stack direction="row" spacing={2}>
            <TextInput
              label="First name"
              placeholder="First name"
              value={firstName}
              onChange={setFirstName}
              error={firstNameError}
              errorText={firstNameError ? 'First name is required' : undefined}
            />

            <TextInput
              label="Last name"
              placeholder="Last name"
              value={lastName}
              onChange={setLastName}
              error={lastNameError}
              errorText={lastNameError ? 'Last name is required' : undefined}
            />
          </Stack>

          {/* Date of birth */}
          <TextField
            fullWidth
            label="Date of birth"
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            error={birthDateError || birthDate > today}
            helperText={
              birthDateError
                ? 'Date of birth is required'
                : birthDate > today
                  ? 'Date cannot be in the future'
                  : undefined
            }
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { max: today },
            }}
            size="small"
          />

          <Typography color="text.secondary">
            Added a child you removed earlier? The same name and birth date
            bring back their history.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={handleClose} />
        <AppButton label="Add child" onClick={handleConfirm} />
      </DialogActions>
    </Dialog>
  )
}
