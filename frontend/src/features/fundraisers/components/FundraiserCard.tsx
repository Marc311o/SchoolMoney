import { useState } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router'

import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'

import WhiteCard from '@/components/WhiteCard'
import { type Fundraiser } from '@/features/fundraisers/api'

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

  const endingSoon =
    isActive && !isBlocked && isEndingSoon(fundraiser.end_date, now)

  const statusColor = isBlocked
    ? 'primary.contrastText'
    : isActive
      ? 'success.main'
      : 'text.secondary'

  const statusBackground = isBlocked
    ? 'error.light'
    : isActive
      ? 'success.light'
      : 'action.hover'

  const statusLabel = isBlocked ? 'BLOCKED' : fundraiser.status

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

            <Box
              sx={{
                px: 1.25,
                py: 0.5,
                borderRadius: 5,
                bgcolor: statusBackground,
                color: statusColor,
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 0.4,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {statusLabel}
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
