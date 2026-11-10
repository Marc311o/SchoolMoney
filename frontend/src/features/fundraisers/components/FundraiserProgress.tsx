import { Box, Typography } from '@mui/material'

import { formatMoney } from '@/lib/money'
import WhiteCard from '@/components/WhiteCard'
import { type FundraiserProgress as FundraiserProgressType } from '@/features/fundraisers/api'

interface FundraiserProgressProps {
  progress: FundraiserProgressType
}

export default function FundraiserProgress({
  progress,
}: FundraiserProgressProps) {
  const required = Number(progress.required_total)
  const paid = Number(progress.paid_total)

  const percentage = required > 0 ? Math.min(100, (paid / required) * 100) : 0

  const amountPerChild =
    progress.children_count > 0 ? required / progress.children_count : 0

  const childrenPaidCount =
    amountPerChild > 0
      ? Math.min(
          progress.children_count,
          Math.floor((paid + 0.001) / amountPerChild),
        )
      : 0

  return (
    <WhiteCard>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography sx={{ fontWeight: 600 }}>
              {childrenPaidCount}/{progress.children_count} children paid
            </Typography>
            <Typography color="text.secondary">
              Collected {percentage.toFixed(0)}%
            </Typography>
          </Box>

          <Box
            sx={{
              height: 10,
              bgcolor: 'action.hover',
              borderRadius: 10,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${percentage}%`,
                height: '100%',
                bgcolor: 'primary.main',
                borderRadius: 10,
                transition: 'width 0.3s',
              }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Amount collected
            </Typography>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 'h2',
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {formatMoney(paid.toString())} /{' '}
              {formatMoney(required.toString())}
            </Typography>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Amount per child
            </Typography>
            <Typography
              sx={{
                fontFamily: 'monospace',
                fontSize: 'h2',
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {formatMoney(amountPerChild.toString())}
            </Typography>
          </Box>
        </Box>
      </Box>
    </WhiteCard>
  )
}
