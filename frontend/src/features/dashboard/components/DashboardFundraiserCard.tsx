import { Box, Stack, Typography } from '@mui/material'
import { useNavigate } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import WhiteCard from '@/components/WhiteCard'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import StatusBadge from '@/components/StatusBadge'
import { formatMoney } from '@/lib/money'

interface DashboardFundraiserCardProps {
  id: string
  name: string
  endDate: string
  requiredAmount: string
  childrenCount: number
  allPaid: boolean
  className: string
}

function formatDate(value: string) {
  if (!value) return '—'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default function DashboardFundraiserCard({
  id,
  name,
  endDate,
  requiredAmount,
  childrenCount,
  allPaid,
  className,
}: DashboardFundraiserCardProps) {
  const navigate = useNavigate()

  return (
    <WhiteCard>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          py: 0,
        }}
      >
        {/* Left side */}
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            minWidth: 0,
            flex: 1,
          }}
        >
          <AppAvatar name={name} size={44} square />

          <Stack spacing={0} sx={{ minWidth: 0 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {name}
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                opacity: 0.75,
                fontSize: '0.8rem',
                mt: 0.25,
              }}
            >
              Ends {formatDate(endDate)} · {className}
            </Typography>
          </Stack>
        </Stack>

        {/* Right side */}
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: { xs: 'space-between', md: 'flex-end' },
            flexWrap: 'wrap',
            rowGap: 1,
          }}
        >
          {childrenCount === 0 ? (
            <StatusBadge>No children</StatusBadge>
          ) : allPaid ? (
            <StatusBadge tone="success">All paid</StatusBadge>
          ) : (
            <StatusBadge tone="warning">Payment required</StatusBadge>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary">
              Per child
            </Typography>

            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: { xs: 12, sm: 17 },
                lineHeight: 1.1,
                fontWeight: 500,
              }}
            >
              {formatMoney(requiredAmount)}
            </Typography>
          </Box>

          <AppButtonOutlined
            label="Details"
            onClick={() => navigate(`/fundraisers/${id}`)}
          />
        </Stack>
      </Stack>
    </WhiteCard>
  )
}
