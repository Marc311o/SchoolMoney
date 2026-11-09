import { Box, CircularProgress, Stack } from '@mui/material'
import { useQueries } from '@tanstack/react-query'

import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'

import { useCurrentUser } from '@/features/auth/api'
import { useDashboardFundraisers } from '@/features/dashboard/api'
import DashboardFundraiserCard from '@/features/dashboard/components/DashboardFundraiserCard'

import type { ClassDetail } from '@/features/classes/api'
import type { FundraiserDetail } from '@/features/fundraisers/api'

import { api } from '@/lib/api'

export function DashboardPage() {
  const { data: me } = useCurrentUser()

  const {
    data: fundraisers = [],
    isPending,
    isError,
  } = useDashboardFundraisers()

  const activeFundraisers = fundraisers.filter(
    (fundraiser) => fundraiser.status === 'ACTIVE' && !fundraiser.is_blocked,
  )

  const fundraiserDetails = useQueries({
    queries: activeFundraisers.map((fundraiser) => ({
      queryKey: ['fundraisers', 'detail', fundraiser.id],
      queryFn: () => api.get<FundraiserDetail>(`/fundraisers/${fundraiser.id}`),
    })),
  })

  const classes = useQueries({
    queries: activeFundraisers.map((fundraiser) => ({
      queryKey: ['classes', 'detail', fundraiser.class_id],
      queryFn: () => api.get<ClassDetail>(`/classes/${fundraiser.class_id}`),
    })),
  })

  return (
    <Stack spacing={3} sx={{ p: '1em', px: { xs: 2, md: 4 } }}>
      <PageHeader title="Dashboard" subtitle="Description here." />

      <PageSection
        title="My active fundraisers"
        count={activeFundraisers.length}
      >
        {isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : isError ? (
          <EmptyState description="Could not load your fundraisers." />
        ) : activeFundraisers.length === 0 ? (
          <EmptyState description="You don't have any active fundraisers." />
        ) : (
          <Stack spacing={2}>
            {activeFundraisers.map((fundraiser, index) => {
              const detail = fundraiserDetails[index]?.data
              const schoolClass = classes[index]?.data

              const loading =
                fundraiserDetails[index]?.isPending || classes[index]?.isPending

              const error =
                fundraiserDetails[index]?.isError || classes[index]?.isError

              const myChildren =
                schoolClass?.children.filter(
                  (member) =>
                    member.status === 'ACTIVE' && member.parent.id === me?.id,
                ) ?? []

              const myChildrenProgress =
                detail?.children.filter((progress) =>
                  myChildren.some(
                    (member) => member.child_id === progress.child_id,
                  ),
                ) ?? []

              const allPaid =
                myChildren.length > 0 &&
                myChildrenProgress.length === myChildren.length &&
                myChildrenProgress.every((child) => child.is_paid)

              if (loading) {
                return (
                  <Box
                    key={fundraiser.id}
                    sx={{ display: 'flex', justifyContent: 'center', p: 3 }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )
              }

              if (error) {
                return (
                  <EmptyState
                    key={fundraiser.id}
                    description={`Could not load information for ${fundraiser.name}.`}
                  />
                )
              }

              return (
                <DashboardFundraiserCard
                  key={fundraiser.id}
                  id={fundraiser.id}
                  name={fundraiser.name}
                  endDate={fundraiser.end_date}
                  requiredAmount={fundraiser.required_amount_per_child}
                  childrenCount={myChildren.length}
                  allPaid={allPaid}
                  className={schoolClass?.name ?? 'Class'}
                />
              )
            })}
          </Stack>
        )}
      </PageSection>
    </Stack>
  )
}
