import { useState } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router'

import WhiteCard from '@/components/WhiteCard'
import { type Fundraiser } from '@/features/fundraisers/api'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'

interface FundraiserCardProps {
  fundraiser: Fundraiser
  canEdit?: boolean
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

function isEndingSoon(endDate: string, now: number) {
  const end = new Date(`${endDate}T23:59:59`).getTime()

  if (Number.isNaN(end)) return false

  const daysUntilEnd = Math.ceil((end - now) / (1000 * 60 * 60 * 24))

  return daysUntilEnd >= 0 && daysUntilEnd <= 2
}

export function FundraiserCard({
  fundraiser,
  canEdit = false,
}: FundraiserCardProps) {
  const [now] = useState(() => Date.now())

  const isActive = fundraiser.status === 'ACTIVE'
  const isBlocked = fundraiser.is_blocked === true

  const endingSoon = isActive && isEndingSoon(fundraiser.end_date, now)

  return (
    <Box
      component={RouterLink}
      to={`/fundraisers/${fundraiser.id}`}
      sx={{
        display: 'block',
        cursor: 'pointer',
        height: '100%',
        color: 'inherit',
        textDecoration: 'none',
      }}
    >
      <WhiteCard
        sx={{
          bgcolor: endingSoon ? 'warning.light' : 'background.paper',
          borderColor: endingSoon ? 'warning.main' : 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            height: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 16,
                overflowWrap: 'anywhere',
                minWidth: 0,
              }}
            >
              {fundraiser.name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {fundraiser.status}
                {isBlocked && ' (BLOCKED)'}
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              {isActive ? 'Ends' : ''} {formatDate(fundraiser.end_date)}
            </Typography>

            {canEdit && (
              <IconButton
                size="small"
                aria-label="Treasurer"
                disableRipple
                sx={{ cursor: 'default' }}
              >
                <AccountBalanceWalletOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </WhiteCard>
    </Box>
  )
}
