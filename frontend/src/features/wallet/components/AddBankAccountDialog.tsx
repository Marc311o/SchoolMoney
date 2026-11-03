import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material'
import { type SubmitEvent, useState } from 'react'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import TextInput from '@/components/TextInput'
import { plainErrorMessage, useAddBankAccount } from '@/features/wallet/api'
import { getFieldErrors } from '@/lib/api'

interface AddBankAccountDialogProps {
  open: boolean
  onClose: () => void
}

export function AddBankAccountDialog({
  open,
  onClose,
}: AddBankAccountDialogProps) {
  const addAccount = useAddBankAccount()
  const [iban, setIban] = useState('')
  const [name, setName] = useState('')

  const fieldErrors = getFieldErrors(addAccount.error)
  // "already added" (409) and "this is a SchoolMoney number" (422) come as a sentence
  const ibanError =
    fieldErrors.iban ?? plainErrorMessage(addAccount.error) ?? undefined

  const close = () => {
    if (addAccount.isPending) return
    setIban('')
    setName('')
    addAccount.reset()
    onClose()
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    addAccount.mutate(
      { iban, account_name: name.trim() || null },
      { onSuccess: close },
    )
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <form noValidate onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>Add a bank account</DialogTitle>

        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Your real account outside SchoolMoney. Transfers out go here.
            </Typography>

            <TextInput
              label="IBAN"
              name="iban"
              placeholder="PL61 1090 1014 0000 0712 1981 2874"
              value={iban}
              onChange={(value) => {
                setIban(value)
                addAccount.reset()
              }}
              errorText={ibanError}
              disabled={addAccount.isPending}
            />

            <TextInput
              label="Name (optional)"
              name="account_name"
              placeholder="e.g. mBank"
              value={name}
              onChange={setName}
              errorText={fieldErrors.account_name}
              disabled={addAccount.isPending}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <AppButtonOutlined
            label="Cancel"
            onClick={close}
            disabled={addAccount.isPending}
          />
          <AppButton
            type="submit"
            label="Add account"
            loading={addAccount.isPending}
          />
        </DialogActions>
      </form>
    </Dialog>
  )
}
