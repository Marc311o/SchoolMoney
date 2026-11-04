import { Stack, Typography } from '@mui/material'
import { type SubmitEvent, useState } from 'react'

import AppButton from '@/components/AppButton'
import TextInput from '@/components/TextInput'
import WhiteCard from '@/components/WhiteCard'
import { useTopUp } from '@/features/wallet/api'
import { getFieldErrors } from '@/lib/api'
import { formatMoney, parseMoneyInput } from '@/lib/money'

const MAX_TOP_UP = 10000

interface TopUpCardProps {
  onDone: (message: string) => void
}

export function TopUpCard({ onDone }: TopUpCardProps) {
  const topUp = useTopUp()
  const [amountInput, setAmountInput] = useState('')
  const [amountError, setAmountError] = useState<string | undefined>()

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const amount = parseMoneyInput(amountInput)
    if (amount === null || Number(amount) <= 0) {
      setAmountError('Enter a valid amount')
      return
    }
    if (Number(amount) > MAX_TOP_UP) {
      setAmountError(
        `You can top up at most ${formatMoney(String(MAX_TOP_UP))} PLN at once`,
      )
      return
    }

    setAmountError(undefined)
    topUp.mutate(
      { amount },
      {
        onSuccess: () => {
          setAmountInput('')
          onDone(`${formatMoney(amount)} PLN added to your wallet`)
        },
        onError: (error) => {
          setAmountError(
            getFieldErrors(error).amount ??
              'Could not top up. Please try again.',
          )
        },
      },
    )
  }

  return (
    <WhiteCard>
      <Stack component="form" noValidate onSubmit={handleSubmit} spacing={1.75}>
        <Typography variant="h2">Top up</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          A virtual transfer into your SchoolMoney account.
          {/*{walletIban ? ` ${formatIban(walletIban)}` : ''}.*/}
        </Typography>

        <TextInput
          label="Amount (PLN)"
          name="amount"
          placeholder="0.00"
          value={amountInput}
          onChange={(value) => {
            setAmountInput(value)
            setAmountError(undefined)
          }}
          errorText={amountError}
          disabled={topUp.isPending}
        />

        <Stack direction="row">
          <AppButton type="submit" label="Top up" loading={topUp.isPending} />
        </Stack>
      </Stack>
    </WhiteCard>
  )
}
