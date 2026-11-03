import { Box, Stack, Typography } from '@mui/material'
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded'
import { useState } from 'react'

import AppButtonOutlined from '@/components/AppButtonOutlined'
import WhiteCard from '@/components/WhiteCard'
import { useBankAccounts } from '@/features/wallet/api'
import { AddBankAccountDialog } from '@/features/wallet/components/AddBankAccountDialog'
import { formatIban } from '@/lib/iban'

/** For Settings: my real bank accounts, the targets of Transfer out */
export function BankAccountsCard() {
  const { data: accounts = [], isPending, isError } = useBankAccounts()
  const [isAddOpen, setIsAddOpen] = useState(false)

  return (
    <WhiteCard padding={3}>
      <Stack sx={{ gap: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
          <AccountBalanceRoundedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Bank accounts
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary">
          Where you can send money from your wallet.
        </Typography>

        {isPending ? null : isError ? (
          <Typography color="error" variant="body2">
            Could not load your bank accounts.
          </Typography>
        ) : accounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No bank accounts yet.
          </Typography>
        ) : (
          <Box
            component="ul"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            {accounts.map((account, index) => (
              <Stack
                key={account.id}
                component="li"
                spacing={0.25}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderTop: index === 0 ? 0 : 1,
                  borderColor: 'divider',
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>
                  {account.account_name ?? 'Bank account'}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 14,
                    color: 'text.secondary',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatIban(account.iban)}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}

        <Stack direction="row">
          <AppButtonOutlined
            label="Add bank account"
            onClick={() => setIsAddOpen(true)}
          />
        </Stack>
      </Stack>

      <AddBankAccountDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </WhiteCard>
  )
}
