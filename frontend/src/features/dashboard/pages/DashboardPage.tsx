import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useQueries } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import PrimaryCard from '@/components/PrimaryCard'
import WhiteCard from '@/components/WhiteCard'

import { useCurrentUser } from '@/features/auth/api'
import { messagePreview, useChats } from '@/features/chat/api'
import { UnreadBadge } from '@/features/chat/components/UnreadBadge'
import { useChildren } from '@/features/children/api'
import { useDashboardFundraisers } from '@/features/dashboard/api'
import DashboardFundraiserCard from '@/features/dashboard/components/DashboardFundraiserCard'
import { useWallet } from '@/features/wallet/api'

import type { ClassDetail } from '@/features/classes/api'
import type { FundraiserDetail } from '@/features/fundraisers/api'

import { PARENT_NAV } from '@/layouts/navigation'
import { api } from '@/lib/api'
import { shortTimestamp } from '@/lib/dates'
import { formatIban } from '@/lib/iban'
import { formatMoney } from '@/lib/money'
import { fullName } from '@/lib/names'

const shortcutItems = PARENT_NAV.filter(
  ({ path }) => path !== '/' && path !== '/children' && path !== '/account',
)

const cardLinkSx = {
  display: 'grid',
  minWidth: 0,
  color: 'inherit',
  textDecoration: 'none',
  borderRadius: 1,
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'primary.main',
    outlineOffset: 3,
  },
} as const

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
    <Stack
      spacing={{ xs: 2.5, md: 3.5 }}
      sx={{ maxWidth: 1320, mx: 'auto', p: { xs: 2, md: 4 } }}
    >
      <PageHeader
        title={me?.first_name ? `Hi, ${me.first_name}` : 'Dashboard'}
      />

      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
        }}
      >
        <WalletOverview />
        <ChildrenOverview />
      </Box>

      <Box
        component="nav"
        aria-label="Quick links"
        sx={{
          display: 'grid',
          gap: { xs: 1, md: 1.5 },
          gridTemplateColumns: {
            xs: 'repeat(2, minmax(0, 1fr))',
            md: 'repeat(4, minmax(0, 1fr))',
          },
        }}
      >
        {shortcutItems.map(({ label, path, icon }) => (
          <Box
            key={path}
            component={RouterLink}
            to={path}
            sx={{
              ...cardLinkSx,
              display: 'flex',
              alignItems: 'center',
              gap: { xs: 1, md: 1.25 },
              minHeight: 52,
              px: { xs: 1, md: 1.75 },
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { borderColor: 'primary.main' },
            }}
          >
            <Box
              component="span"
              sx={{
                display: 'flex',
                color: 'primary.main',
                '& svg': { fontSize: 20 },
              }}
            >
              {icon}
            </Box>
            <Typography
              component="span"
              variant="body2"
              sx={{ fontWeight: 700 }}
            >
              {label}
            </Typography>
            <ArrowForwardRoundedIcon
              sx={{
                display: { xs: 'none', sm: 'block' },
                ml: 'auto',
                fontSize: 16,
                color: 'text.secondary',
              }}
            />
          </Box>
        ))}
      </Box>

      <PageSection title="Open fundraisers" count={activeFundraisers.length}>
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

      <RecentMessages myId={me?.id ?? ''} />
    </Stack>
  )
}

function WalletOverview() {
  const { data: wallet, isPending } = useWallet()

  return (
    <Box
      component={RouterLink}
      to="/account"
      sx={{ ...cardLinkSx, '&:hover': { boxShadow: 2 } }}
    >
      <PrimaryCard
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          minHeight: 216,
          p: { xs: 2, sm: 3 },
          color: '#FFFFFF',
          background: 'linear-gradient(145deg, #14261E 18%, #1D4735 100%)',
        }}
      >
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography
            component="h2"
            sx={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#C9DDD0',
            }}
          >
            WALLET BALANCE
          </Typography>

          {wallet ? (
            <>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: { xs: 24, sm: 36, lg: 40 },
                  fontWeight: 700,
                  lineHeight: 1.2,
                  fontVariantNumeric: 'tabular-nums',
                  overflowWrap: 'anywhere',
                }}
              >
                {formatMoney(wallet.balance)}{' '}
                <Box component="span" sx={{ fontSize: '0.52em' }}>
                  PLN
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  color: '#C9DDD0',
                  overflowWrap: 'anywhere',
                }}
              >
                {formatIban(wallet.iban)}
              </Typography>
            </>
          ) : isPending ? (
            <Skeleton
              variant="text"
              aria-label="Loading wallet balance"
              width={132}
              sx={{ fontSize: 36, bgcolor: 'rgba(255, 255, 255, 0.16)' }}
            />
          ) : (
            <Typography variant="body2">
              Could not load your balance.
            </Typography>
          )}
        </Stack>

        <Stack
          component="span"
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            bgcolor: '#9FE0B8',
            color: '#14261E',
            borderRadius: 0.8,
            px: 1.5,
            py: 1,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          Open wallet
          <ArrowForwardRoundedIcon sx={{ fontSize: 17 }} />
        </Stack>
      </PrimaryCard>
    </Box>
  )
}

function ChildrenOverview() {
  const { data: children = [], isPending, isError } = useChildren()

  return (
    <Box
      component={RouterLink}
      to="/children"
      sx={{ ...cardLinkSx, '&:hover > *': { borderColor: 'primary.main' } }}
    >
      <WhiteCard sx={{ minHeight: 216, p: { xs: 2, sm: 3 } }}>
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 0.75,
            }}
          >
            <Typography variant="h2">Your children</Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{ color: 'primary.main', fontWeight: 700 }}
            >
              View children
            </Typography>
          </Stack>

          {children.length > 0 ? (
            <Stack spacing={1.5}>
              {children.slice(0, 2).map((child) => {
                const name = fullName(child)

                return (
                  <Stack
                    key={child.id}
                    direction="row"
                    spacing={1.25}
                    sx={{ alignItems: 'center' }}
                  >
                    <AppAvatar name={name} src={child.avatar_url} size={38} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                      >
                        {name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: 13 }}
                      >
                        {child.school_class
                          ? `Class ${child.school_class.name}`
                          : 'No class yet'}
                        {child.school_class?.status === 'PENDING' &&
                          ' · Waiting for approval'}
                      </Typography>
                    </Box>
                  </Stack>
                )
              })}
            </Stack>
          ) : isPending ? (
            <Skeleton
              variant="rounded"
              width="100%"
              height={72}
              aria-label="Loading child profiles"
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {isError
                ? 'Could not load your children.'
                : 'No children added yet.'}
            </Typography>
          )}
        </Stack>
      </WhiteCard>
    </Box>
  )
}

function RecentMessages({ myId }: { myId: string }) {
  const { data: chats = [], isPending, isError } = useChats()
  const recentChats = chats.filter((chat) => chat.last_message).slice(0, 2)

  return (
    <PageSection
      title="Messages"
      action={
        <Button
          component={RouterLink}
          to="/chat"
          size="small"
          endIcon={<ArrowForwardRoundedIcon />}
        >
          All messages
        </Button>
      }
    >
      {recentChats.length > 0 ? (
        <WhiteCard padding={0} sx={{ overflow: 'hidden' }}>
          <Stack divider={<Divider />}>
            {recentChats.map((chat) => (
              <Box
                key={chat.id}
                component={RouterLink}
                to={`/chat/${chat.id}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  alignItems: 'center',
                  gap: 1.5,
                  px: { xs: 1.5, sm: 2.5 },
                  py: 1.75,
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                    outlineOffset: -2,
                  },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap variant="body2" sx={{ fontWeight: 700 }}>
                    {chat.title}
                  </Typography>
                  <Typography noWrap variant="body2" color="text.secondary">
                    {messagePreview(chat, myId)}
                  </Typography>
                </Box>
                <Stack spacing={0.75} sx={{ alignItems: 'flex-end' }}>
                  <Typography
                    component="time"
                    dateTime={chat.last_activity_at}
                    variant="caption"
                    color="text.secondary"
                  >
                    {shortTimestamp(chat.last_activity_at)}
                  </Typography>
                  <UnreadBadge count={chat.unread_count} />
                </Stack>
              </Box>
            ))}
          </Stack>
        </WhiteCard>
      ) : isPending ? (
        <WhiteCard padding={2}>
          <Skeleton variant="text" width="65%" aria-label="Loading messages" />
        </WhiteCard>
      ) : (
        <EmptyState
          description={
            isError ? 'Could not load your messages.' : 'No messages yet.'
          }
        />
      )}
    </PageSection>
  )
}
