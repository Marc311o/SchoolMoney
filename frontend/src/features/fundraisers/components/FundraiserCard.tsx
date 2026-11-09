import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router'

import WhiteCard from '@/components/WhiteCard'
import { type Fundraiser } from '@/features/fundraisers/api'
import { IconButton } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'

interface FundraiserCardProps {
  fundraiser: Fundraiser
  canEdit?: boolean
  onEdit?: () => void
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export function FundraiserCard({
  fundraiser,
  canEdit = false,
  onEdit,
}: FundraiserCardProps) {
    const navigate = useNavigate()

  const isActive = fundraiser.status === 'ACTIVE'
  const isBlocked = fundraiser.is_blocked === true

  return (
    <Box
      onClick={() => navigate(`/fundraisers/${fundraiser.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          navigate(`/fundraisers/${fundraiser.id}`)
        }
      }}
      sx={{ cursor: 'pointer', height: '100%' }}
    >
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
                aria-label="Edit fundraiser"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit?.()
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </WhiteCard>
    </Box>
  )
}
