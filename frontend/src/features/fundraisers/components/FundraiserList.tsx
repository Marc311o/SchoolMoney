import { Box, CircularProgress, Stack } from '@mui/material'

import EmptyState from '@/components/EmptyState'
import { FundraiserCard } from '@/features/fundraisers/components/FundraiserCard'
import { type Fundraiser } from '@/features/fundraisers/api'

interface FundraiserListProps {
  fundraisers: Fundraiser[]
  filteredFundraisers: Fundraiser[]
  loading: boolean
  isTreasurer: boolean
  onEdit: (fundraiser: Fundraiser) => void
}

export default function FundraiserList({
  fundraisers,
  filteredFundraisers,
  loading,
  isTreasurer,
  onEdit,
}: FundraiserListProps) {
  if (loading) {
    return <CircularProgress />
  }

  if (fundraisers.length === 0) {
    return (
      <EmptyState
        dashed
        description={
          isTreasurer
            ? 'No fundraisers yet. Create your first fundraiser.'
            : 'There are no fundraisers in this class yet.'
        }
      />
    )
  }

  if (filteredFundraisers.length === 0) {
    return <EmptyState dashed description="No fundraisers match this filter." />
  }

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))',
          },
          alignItems: 'stretch',
        }}
      >
        {filteredFundraisers.map((fundraiser) => (
          <FundraiserCard
            key={fundraiser.id}
            fundraiser={fundraiser}
            canEdit={
              isTreasurer &&
              !fundraiser.is_blocked &&
              fundraiser.status !== 'CLOSED'
            }
            onEdit={() => onEdit(fundraiser)}
          />
        ))}
      </Box>
    </Stack>
  )
}
