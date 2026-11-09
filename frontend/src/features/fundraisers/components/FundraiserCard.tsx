import { Box, Typography } from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import { type Fundraiser } from '@/features/fundraisers/api'

interface FundraiserCardProps {
  fundraiser: Fundraiser
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function FundraiserCard({ fundraiser }: FundraiserCardProps) {
  const isActive = fundraiser.status === 'ACTIVE'
  const isBlocked = fundraiser.is_blocked === true

  return (
    <WhiteCard>
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

        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {isActive ? 'Ends' : ''} {formatDate(fundraiser.end_date)}
        </Typography>
      </Box>
    </WhiteCard>
  )
}
