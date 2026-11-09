import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'

import { Link as RouterLink, useParams } from 'react-router'

import PageSection from '@/components/PageSection'
import StatusBadge from '@/components/StatusBadge'

import { useCurrentUser } from '@/features/auth/api'
import { useClass } from '@/features/classes/api'

import {
  useFundraiser,
  useFundraiserPayments,
} from '@/features/fundraisers/api'

import FundraiserProgress from '@/features/fundraisers/components/FundraiserProgress'
import FundraiserAccountCard from '@/features/fundraisers/components/FundraiserAccountCard'
import FundraiserChildren from '@/features/fundraisers/components/FundraiserChildren'
import FundraiserPayments from '@/features/fundraisers/components/FundraiserPayments'
import AppAvatar from '@/components/AppAvatar'

export default function FundraiserPage() {
  const { fundraiserId = '' } = useParams()

  const { data: fundraiser, isPending, error } = useFundraiser(fundraiserId)

  const { data: me } = useCurrentUser()

  const { data: schoolClass, isPending: classPending } = useClass(
    fundraiser?.class_id ?? '',
  )

  const { data: payments = [], isPending: paymentsPending } =
    useFundraiserPayments(fundraiserId)

  if (isPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  if (error || !fundraiser) {
    return (
      <Stack spacing={2} sx={{ p: '1em' }}>
        <Typography variant="h5">Could not load fundraiser</Typography>

        <Link component={RouterLink} to="/classes">
          Back to classes
        </Link>
      </Stack>
    )
  }

  if (classPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  // All active children in the class
  const allChildren =
    schoolClass?.children.filter((member) => member.status === 'ACTIVE') ?? []

  // Only current user's active children
  const myChildren = allChildren.filter((member) => member.parent.id === me?.id)

  const isBlocked = fundraiser.is_blocked

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ fontSize: 14 }}>
        <Link component={RouterLink} to="/classes" underline="hover">
          Classes
        </Link>

        <Link
          component={RouterLink}
          to={`/classes/${fundraiser.class_id}`}
          underline="hover"
        >
          {schoolClass?.name ?? 'Class'}
        </Link>

        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {fundraiser.name}
        </Typography>
      </Breadcrumbs>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        {/* Column 1 – Avatar */}
        <AppAvatar
          name={fundraiser.name}
          src={fundraiser.logo_url}
          size={80}
          square={true}
        />

        {/* Column 2 – Fundraiser information */}
        <Stack spacing={0.75} sx={{ minWidth: 0 }}>
          {/* Row 1 – Name and status */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography variant="h1" sx={{ overflowWrap: 'anywhere' }}>
              {fundraiser.name}
            </Typography>

            <Box sx={{ alignSelf: 'flex-start', pt: 0.5 }}>
              <StatusBadge>
                {isBlocked ? 'Blocked' : fundraiser.status}
              </StatusBadge>
            </Box>
          </Stack>

          {/* Row 2 – Class, school and dates */}
          <Typography variant="body2" color="text.secondary">
            {[
              schoolClass?.name,
              schoolClass?.school_name,
              `${fundraiser.start_date} – ${fundraiser.end_date}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Typography>

          {/* Row 3 – Description */}
          {fundraiser.description && (
            <Typography color="text.secondary">
              {fundraiser.description}
            </Typography>
          )}
        </Stack>
      </Stack>

      <PageSection title="Progress">
        <FundraiserProgress progress={fundraiser.progress} />
      </PageSection>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'minmax(0, 3fr) minmax(280px, 2fr)',
          },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <PageSection title="Your children">
            <FundraiserChildren
              members={myChildren}
              childrenProgress={fundraiser.children}
              payments={payments}
              onPay={() => {
                // TODO Open payment confirmation dialog
              }}
              onWithdraw={() => {
                // TODO Open refund confirmation dialog
              }}
            />
          </PageSection>

          <PageSection title="Payments">
            <FundraiserPayments
              payments={payments}
              members={schoolClass?.children ?? []}
              childrenProgress={fundraiser.children}
              loading={paymentsPending || classPending}
              onPay={() => {
                // TODO Open payment confirmation dialog
              }}
            />
          </PageSection>
        </Stack>

        {/* Right column */}
        <Box sx={{ minWidth: 0 }}>
          <PageSection title="Account">
            <FundraiserAccountCard
              iban={fundraiser.iban}
              balance={fundraiser.progress.current_balance}
            />
          </PageSection>
        </Box>
      </Box>
    </Stack>
  )
}
