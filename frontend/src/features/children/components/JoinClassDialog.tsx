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

import type { ApiError } from '@/lib/api'

interface JoinClassDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (code: string) => void
  childName: string
  loading?: boolean
  error?: ApiError | null
}

export default function JoinClassDialog({
  open,
  onClose,
  onConfirm,
  childName,
  loading = false,
  error,
}: JoinClassDialogProps) {
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const codeError =
    submitted && !code.trim()
      ? 'Access code is required'
      : error?.status === 404
        ? 'Invalid or expired access code.'
        : error?.status === 409
          ? 'This child already belongs to a class or has a pending request.'
          : error
            ? 'Something went wrong. Please try again.'
            : undefined

  const handleClose = () => {
    if (loading) return

    setCode('')
    setSubmitted(false)
    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (!code.trim()) return

    onConfirm(code.trim())
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Join a class</DialogTitle>

      <DialogContent>
        <Stack component="div" sx={{ gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enter the access code provided by your class treasurer to join a
            class for {childName}.
          </Typography>

          <TextInput
            label="Access code"
            placeholder="Enter access code"
            value={code}
            onChange={setCode}
            error={Boolean(codeError)}
            errorText={codeError}
            disabled={loading}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={handleClose} />

        <AppButton
          label="Join"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
