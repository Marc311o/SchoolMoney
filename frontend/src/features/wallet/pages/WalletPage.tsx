import { Box, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import AppSnackbar from '@/components/AppSnackbar'
import PageHeader from '@/components/PageHeader'
import { useWallet } from '@/features/wallet/api'
import { BalanceCard } from '@/features/wallet/components/BalanceCard'
import { TopUpCard } from '@/features/wallet/components/TopUpCard'
import { TransferOutCard } from '@/features/wallet/components/TransferOutCard'
import { TransactionHistory } from '@/features/wallet/components/TransactionHistory'

export function WalletPage() {
  const { data: wallet, isError } = useWallet()
  const [toast, setToast] = useState<{ message: string; id: number } | null>(
    null,
  )

  const notify = (message: string) => setToast({ message, id: Date.now() })

  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <PageHeader title="Wallet" />

      {isError ? (
        <Typography color="error">Could not load your wallet.</Typography>
      ) : (
        <>
          <BalanceCard wallet={wallet} />

          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              alignItems: 'stretch',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',
            }}
          >
            <TopUpCard onDone={notify} />
            <TransferOutCard balance={wallet?.balance} onDone={notify} />
          </Box>

          {wallet && <TransactionHistory walletId={wallet.id} />}
        </>
      )}

      <AppSnackbar
        key={toast?.id}
        open={toast !== null}
        message={toast?.message ?? ''}
        severity="success"
        onClose={() => setToast(null)}
      />
    </Stack>
  )
}
