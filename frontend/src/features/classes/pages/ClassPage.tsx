import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink, useParams } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import WhiteCard from '@/components/WhiteCard'
import { useCurrentUser } from '@/features/auth/api'
import { isClassNotFound, useClass } from '@/features/classes/api'
import { ClassChildrenList } from '@/features/classes/components/ClassChildrenList'
import { WaitingList } from '@/features/classes/components/WaitingList'

export function ClassPage() {
  const { classId = '' } = useParams()
  const { data: schoolClass, isPending, error } = useClass(classId)
  const { data: me } = useCurrentUser()

  if (isPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  if (error) {
    return (
      <Stack spacing={2} sx={{ p: '1em', alignItems: 'flex-start' }}>
        <Typography component="h1" sx={{ fontSize: 24, fontWeight: 700 }}>
          {isClassNotFound(error)
            ? 'Class not found'
            : 'Could not load the class'}
        </Typography>
        <Link component={RouterLink} to="/classes">
          Back to classes
        </Link>
      </Stack>
    )
  }

  const isTreasurer = schoolClass.my_role === 'TREASURER'
  const members = schoolClass.children.filter((m) => m.status === 'ACTIVE')
  const waiting = schoolClass.children.filter((m) => m.status === 'PENDING')
  const treasurerName = `${schoolClass.treasurer.first_name} ${schoolClass.treasurer.last_name}`

  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <Breadcrumbs aria-label="Breadcrumb" sx={{ fontSize: 14 }}>
        <Link component={RouterLink} to="/classes" underline="hover">
          Classes
        </Link>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          {schoolClass.name}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
              fontSize: { xs: 28, md: 36 },
              fontWeight: 700,
            }}
          >
            Class {schoolClass.name}
          </Typography>
          {isTreasurer && (
            <Typography
              component="span"
              sx={{
                px: 1.25,
                py: 0.25,
                borderRadius: 999,
                bgcolor: 'warning.light',
                color: 'warning.dark',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              You are treasurer
            </Typography>
          )}
        </Stack>

        <Typography sx={{ color: 'text.secondary' }}>
          {[schoolClass.school_name, childrenCount(members.length)]
            .filter(Boolean)
            .join(' · ')}
        </Typography>

        {!isTreasurer && (
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <AppAvatar
              name={treasurerName}
              src={schoolClass.treasurer.avatar_url}
              size={36}
            />
            <Typography sx={{ fontSize: 14 }}>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                Treasurer:{' '}
              </Box>
              <b>{treasurerName}</b>
            </Typography>
          </Stack>
        )}
      </Stack>

      {/*TODO: LEFT FOR LATER */}
      {/*{isTreasurer && (*/}
      {/*  <Box*/}
      {/*    sx={{*/}
      {/*      display: 'grid',*/}
      {/*      gap: 2.5,*/}
      {/*      gridTemplateColumns:*/}
      {/*        'repeat(auto-fit, minmax(min(340px, 100%), 1fr))',*/}
      {/*    }}*/}
      {/*  >*/}
      {/*    <Section title="Access code">*/}
      {/*      <ComingSoon />*/}
      {/*    </Section>*/}
      {/*    <Section title="Invite a parent">*/}
      {/*      <ComingSoon />*/}
      {/*    </Section>*/}
      {/*  </Box>*/}
      {/*)}*/}

      {isTreasurer && (
        <Section title="Waiting for approval" count={waiting.length}>
          {/* TODO: pass onApprove / onReject when the endpoint exists */}
          <WaitingList members={waiting} />
        </Section>
      )}

      <Section title="Children" count={members.length}>
        <ClassChildrenList
          members={members}
          currentUserId={me?.id}
          emptyText="No children in this class yet."
          showRemove={isTreasurer}
        />
      </Section>

      <Section title="Fundraisers">
        <ComingSoon />
      </Section>
    </Stack>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: ReactNode
}) {
  return (
    <Stack component="section" spacing={1.5}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline' }}>
        <Typography
          component="h2"
          sx={{
            fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
        {count !== undefined && (
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {count}
          </Typography>
        )}
      </Stack>
      {children}
    </Stack>
  )
}

function ComingSoon() {
  return (
    <WhiteCard
      padding={2.5}
      sx={{ bgcolor: 'transparent', borderStyle: 'dashed' }}
    >
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
        Coming soon.
      </Typography>
    </WhiteCard>
  )
}

function childrenCount(count: number): string {
  return count === 1 ? '1 child' : `${count} children`
}
