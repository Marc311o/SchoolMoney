import { useState } from 'react'

import { Stack, Typography } from '@mui/material'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import IconButton from '@mui/material/IconButton'

import PrimaryCard from '@/components/PrimaryCard'
import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import { formatMoney } from '@/lib/money'

interface FundraiserAccountCardProps {
  iban: string | null
  balance: string
}

export default function FundraiserAccountCard({
  iban,
  balance,
}: FundraiserAccountCardProps) {
  const [toast, setToast] = useState<{
    message: string
    severity: SnackbarSeverity
    id: number
  } | null>(null)

  const notify = (message: string, severity: SnackbarSeverity = 'success') => {
    setToast({ message, severity, id: Date.now() })
  }

  const handleCopyIban = async () => {
    if (!iban) return

    try {
      await navigator.clipboard.writeText(iban)
      notify('IBAN copied to clipboard')
    } catch {
      notify('Could not copy IBAN', 'error')
    }
  }

  return (
    <>
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
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <AccountBalanceOutlinedIcon />
              <Typography
                sx={{ fontSize: 13, letterSpacing: '0.06em', opacity: 0.75 }}
              >
                FUNDRAISER ACCOUNT
              </Typography>
            </Stack>

            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: { xs: 36, sm: 48 },
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {formatMoney(balance)}
            </Typography>
          </Stack>

          <Stack spacing={0.5}>
            <Typography sx={{ fontSize: 13, opacity: 0.75 }}>
              Account number (IBAN)
            </Typography>

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 15,
                  overflowWrap: 'anywhere',
                }}
              >
                {iban || 'Not available'}
              </Typography>

              {iban && (
                <IconButton
                  size="small"
                  aria-label="Copy IBAN"
                  sx={{ color: 'inherit' }}
                  onClick={handleCopyIban}
                >
                  <ContentCopyOutlinedIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Stack>
        </Stack>
      </PrimaryCard>

      <AppSnackbar
        key={toast?.id}
        open={toast !== null}
        message={toast?.message ?? ''}
        severity={toast?.severity}
        variant="standard"
        onClose={() => setToast(null)}
      />
    </>
  )
}
