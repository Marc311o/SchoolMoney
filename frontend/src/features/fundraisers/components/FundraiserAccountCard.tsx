import { useState } from 'react'

import { Stack, Typography, Divider } from '@mui/material'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import IconButton from '@mui/material/IconButton'

import PrimaryCard from '@/components/PrimaryCard'
import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import { formatMoney } from '@/lib/money'

interface FundraiserAccountCardProps {
  iban: string | null
  balance: string
  collected: string
  withdrawals: string
  deposits: string
}

export default function FundraiserAccountCard({
  iban,
  balance,
  collected,
  withdrawals,
  deposits,
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

  const history = [
    { label: 'Collected', value: collected },
    { label: 'Withdrawals', value: withdrawals },
    { label: 'Deposits', value: deposits },
  ]

  return (
    <>
      <PrimaryCard>
        <Stack
          sx={{
            p: { xs: 1.5, sm: 2.5 },
          }}
          spacing={2}
        >
          <Stack
            direction="row"
            sx={{
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 2.5,
            }}
          >
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <AccountBalanceOutlinedIcon sx={{ color: '#fff' }} />
                <Typography
                  sx={{
                    fontSize: 13,
                    letterSpacing: '0.06em',
                    opacity: 0.75,
                    color: '#fff',
                  }}
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
                  color: '#fff',
                }}
              >
                {formatMoney(balance)}
              </Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Typography sx={{ fontSize: 13, opacity: 0.75, color: '#fff' }}>
                Account number (IBAN)
              </Typography>

              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: 'center' }}
              >
                <Typography
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: 15,
                    overflowWrap: 'anywhere',
                    color: '#fff',
                  }}
                >
                  {iban || 'Not available'}
                </Typography>

                {iban && (
                  <IconButton
                    size="small"
                    aria-label="Copy IBAN"
                    sx={{ color: '#fff' }}
                    onClick={handleCopyIban}
                  >
                    <ContentCopyOutlinedIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          </Stack>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)' }} />

          <Stack spacing={1.5}>
            <Typography
              sx={{
                fontSize: 13,
                letterSpacing: '0.06em',
                fontWeight: 600,
                color: '#fff',
                opacity: 0.75,
              }}
            >
              ACCOUNT HISTORY
            </Typography>

            <Stack spacing={1.5}>
              {history.map((item) => (
                <Stack
                  key={item.label}
                  direction="row"
                  sx={{
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Typography
                    sx={{
                      color: '#fff',
                      fontSize: 14,
                    }}
                  >
                    {item.label}
                  </Typography>

                  <Typography
                    sx={{
                      color: '#fff',
                      fontFamily: 'monospace',
                      fontSize: { xs: 15, sm: 17 },
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatMoney(item.value)}
                  </Typography>
                </Stack>
              ))}
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
