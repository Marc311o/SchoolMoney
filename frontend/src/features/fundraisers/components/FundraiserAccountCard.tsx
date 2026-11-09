import { Stack, Typography } from '@mui/material'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import IconButton from '@mui/material/IconButton'

import PrimaryCard from '@/components/PrimaryCard.tsx'

interface FundraiserAccountCardProps {
  iban: string | null
  balance: string
}

function formatMoney(value: string | number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'PLN',
  }).format(Number(value))
}

export default function FundraiserAccountCard({
  iban,
  balance,
}: FundraiserAccountCardProps) {
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
                onClick={() => navigator.clipboard.writeText(iban)}
              >
                <ContentCopyOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Stack>
    </PrimaryCard>
  )
}
