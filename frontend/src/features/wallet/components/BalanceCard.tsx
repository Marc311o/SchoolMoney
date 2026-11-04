import { Skeleton, Stack, Typography } from '@mui/material'

import type { Wallet } from '@/features/wallet/api'
import { formatIban } from '@/lib/iban'
import { formatMoney } from '@/lib/money'
import PrimaryCard from '@/components/PrimaryCard.tsx'

interface BalanceCardProps {
  wallet?: Wallet
}

/** Dark card with the balance and the wallet's (fictional) account number */
export function BalanceCard({ wallet }: BalanceCardProps) {
  return (
    <PrimaryCard>
      <Stack
        direction="row"
        sx={{
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 2.5,
          p: { xs: 1.5, sm: 2.5 },
        }}
      >
        <Stack spacing={1}>
          <Typography
            sx={{ fontSize: 13, letterSpacing: '0.06em', opacity: 0.75 }}
          >
            BALANCE
          </Typography>
          {wallet ? (
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: { xs: 36, sm: 48 },
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {formatMoney(wallet.balance)}{' '}
              <Typography
                component="span"
                sx={{ font: 'inherit', fontSize: '0.45em' }}
              >
                PLN
              </Typography>
            </Typography>
          ) : (
            <Skeleton
              variant="text"
              width={220}
              sx={{ fontSize: 48, bgcolor: 'rgba(255, 255, 255, 0.15)' }}
            />
          )}
        </Stack>

        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: 13, opacity: 0.75 }}>
            Your account number
          </Typography>
          <Typography sx={{ fontFamily: 'monospace', fontSize: 15 }}>
            {wallet ? formatIban(wallet.iban) : '…'}
          </Typography>
        </Stack>
      </Stack>
    </PrimaryCard>
  )
}
