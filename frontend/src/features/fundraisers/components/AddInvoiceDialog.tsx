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

interface AddInvoiceDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (payload: {
    title: string
    amount: string | null
    file: File
  }) => void
  loading?: boolean
  error?: string | null
}

export default function AddInvoiceDialog({
  open,
  onClose,
  onConfirm,
  loading = false,
  error,
}: AddInvoiceDialogProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const amountNumber = Number(amount.replace(',', '.'))

  const titleError =
    submitted && !title.trim() ? 'Invoice title is required.' : ''

  const amountError =
    submitted &&
    amount.trim() &&
    (!Number.isFinite(amountNumber) ||
      amountNumber <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.')))
      ? 'Enter a valid amount greater than zero.'
      : ''

  const fileError = submitted && !file ? 'Please select an invoice file.' : ''

  const handleClose = () => {
    if (loading) return

    setTitle('')
    setAmount('')
    setFile(null)
    setSubmitted(false)

    onClose()
  }

  const handleConfirm = () => {
    setSubmitted(true)

    if (
      !title.trim() ||
      !file ||
      (amount.trim() &&
        (!Number.isFinite(amountNumber) ||
          amountNumber <= 0 ||
          !/^\d+(\.\d{1,2})?$/.test(amount.replace(',', '.'))))
    ) {
      return
    }

    onConfirm({
      title: title.trim(),
      amount: amount.trim() ? amountNumber.toFixed(2) : null,
      file,
    })
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>Add invoice</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextInput
            label="Invoice title"
            placeholder="e.g. Bus rental"
            value={title}
            onChange={setTitle}
            error={!!titleError}
            errorText={titleError}
            disabled={loading}
          />

          <TextInput
            label="Amount (optional)"
            placeholder="e.g. 250.00"
            value={amount}
            onChange={setAmount}
            error={!!amountError}
            errorText={amountError}
            disabled={loading}
          />

          <Stack spacing={0.5}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Invoice file
            </Typography>

            <TextField
              fullWidth
              type="file"
              size="small"
              disabled={loading}
              onChange={(event) => {
                const input = event.target as HTMLInputElement
                setFile(input.files?.[0] ?? null)
              }}
              slotProps={{
                htmlInput: {
                  accept: '.pdf,.jpg,.jpeg,.png,.webp',
                },
              }}
              error={!!fileError}
              helperText={fileError}
            />

            {file && (
              <Typography variant="caption" color="text.secondary">
                Selected file: {file.name}
              </Typography>
            )}
          </Stack>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={handleClose} />

        <AppButton
          label="Add invoice"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        />
      </DialogActions>
    </Dialog>
  )
}
