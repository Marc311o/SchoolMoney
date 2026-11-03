import { Link, Stack, Typography } from '@mui/material'
import { type SubmitEvent, useState } from 'react'
import { Link as RouterLink } from 'react-router'

import AppButtonOutlined from '@/components/AppButtonOutlined'
import SelectInput from '@/components/SelectInput'
import TextInput from '@/components/TextInput'
import WhiteCard from '@/components/WhiteCard'
import {
  isNotEnoughMoney,
  plainErrorMessage,
  useBankAccounts,
  useTransferOut,
} from '@/features/wallet/api'
import { getFieldErrors } from '@/lib/api'
import { shortIban } from '@/lib/iban'
import { formatMoney, parseMoneyInput } from '@/lib/money'

interface TransferOutCardProps {
  /** Current balance, to stop a transfer that cannot succeed before sending it */
  balance?: string
  onDone: (message: string) => void
}

export function TransferOutCard({ balance, onDone }: TransferOutCardProps) {
  const { data: accounts = [], isPending: accountsLoading } = useBankAccounts()
  const transfer = useTransferOut()
  const [selectedId, setSelectedId] = useState('')
  const [amountInput, setAmountInput] = useState('')
  const [amountError, setAmountError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | undefined>()

  // The first account is picked until the user chooses another one
  const accountId = selectedId || accounts[0]?.id || ''

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(undefined)

    const amount = parseMoneyInput(amountInput)
    if (amount === null || Number(amount) <= 0) {
      setAmountError('Enter a valid amount')
      return
    }
    if (balance !== undefined && Number(amount) > Number(balance)) {
      setAmountError('Not enough money in your wallet')
      return
    }

    setAmountError(undefined)
    transfer.mutate(
      { external_account_id: accountId, amount },
      {
        onSuccess: () => {
          setAmountInput('')
          onDone(`${formatMoney(amount)} PLN sent to your bank account`)
        },
        onError: (error) => {
          if (isNotEnoughMoney(error)) {
            setAmountError('Not enough money in your wallet')
            return
          }
          const fieldError = getFieldErrors(error).amount
          if (fieldError) {
            setAmountError(fieldError)
            return
          }
          setFormError(
            plainErrorMessage(error) ??
              'Could not send the transfer. Please try again.',
          )
        },
      },
    )
  }

  return (
    <WhiteCard>
      <Stack component="form" noValidate onSubmit={handleSubmit} spacing={1.75}>
        <Typography variant="h2">Transfer out</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          The only way money leaves SchoolMoney.
        </Typography>

        {accountsLoading ? null : accounts.length === 0 ? (
          <Typography sx={{ pt: 3, fontSize: 14 }}>
            You have no bank account yet.{' '}
            <Link component={RouterLink} to="/settings">
              Add one in Settings
            </Link>
            .
          </Typography>
        ) : (
          <>
            <SelectInput
              label="To bank account"
              name="bank-account"
              value={accountId}
              onChange={setSelectedId}
              options={accounts.map((account) => ({
                value: account.id,
                label: `${account.account_name ?? 'Bank account'} · ${shortIban(account.iban)}`,
              }))}
              disabled={transfer.isPending}
            />

            <TextInput
              label="Amount (PLN)"
              name="transfer-amount"
              placeholder="0.00"
              value={amountInput}
              onChange={(value) => {
                setAmountInput(value)
                setAmountError(undefined)
              }}
              errorText={amountError}
              disabled={transfer.isPending}
            />

            {formError && (
              <Typography color="error" sx={{ fontSize: 13 }}>
                {formError}
              </Typography>
            )}

            <Stack direction="row">
              <AppButtonOutlined
                type="submit"
                label="Send transfer"
                loading={transfer.isPending}
              />
            </Stack>
          </>
        )}
      </Stack>
    </WhiteCard>
  )
}
