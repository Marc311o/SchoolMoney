import { useEffect, useState } from 'react'
import {
  Box,
  CircularProgress,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'

import AppSnackbar, { type SnackbarSeverity } from '@/components/AppSnackbar'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import SelectChips, { type SelectChipOption } from '@/components/SelectChips'
import TablePager from '@/components/TablePager'
import TextInput from '@/components/TextInput'
import WhiteCard from '@/components/WhiteCard'
import {
  type AccountStatus,
  type AdminUser,
  useAdminUsers,
  useSetUserStatus,
} from '@/features/admin/api'
import { UsersTable } from '@/features/admin/components/UsersTable'
import { fullName } from '@/lib/names'

type Tab = 'parents' | 'treasurers'
type StatusFilter = AccountStatus | 'ALL'

const TABS: SelectChipOption<Tab>[] = [
  { value: 'parents', label: 'Parents' },
  { value: 'treasurers', label: 'Treasurers' },
]

const STATUSES: SelectChipOption<StatusFilter>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'PENDING_ACTIVATION', label: 'Not activated' },
]

const SEARCH_DELAY_MS = 300

export function AdminUsersPage() {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('sm'))
  const compact = useMediaQuery(theme.breakpoints.down('md'))
  const wide = useMediaQuery(theme.breakpoints.up('lg'))

  const [tab, setTab] = useState<Tab>('parents')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [toBlock, setToBlock] = useState<AdminUser | null>(null)
  const [toast, setToast] = useState<{
    message: string
    severity: SnackbarSeverity
    id: number
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setQ(search), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  const users = useAdminUsers({
    q,
    status,
    treasurersOnly: tab === 'treasurers',
    page,
    pageSize,
  })
  const setUserStatus = useSetUserStatus()

  const notify = (message: string, severity: SnackbarSeverity = 'success') =>
    setToast({ message, severity, id: Date.now() })

  const changeFilter =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }

  const block = () => {
    if (!toBlock) return
    setUserStatus.mutate(
      { userId: toBlock.id, status: 'BLOCKED' },
      {
        onSuccess: () => {
          notify(`${fullName(toBlock)} is blocked`)
          setToBlock(null)
        },
      },
    )
  }

  const unblock = (user: AdminUser) =>
    setUserStatus.mutate(
      { userId: user.id, status: 'ACTIVE' },
      {
        onSuccess: () => notify(`${fullName(user)} can log in again`),
        onError: () => notify('Could not unblock the user', 'error'),
      },
    )

  const blockingTreasurer = toBlock && toBlock.classes.length > 0

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      <PageHeader
        title="Users"
        subtitle="Everyone with a SchoolMoney account. A blocked user can't log in or move money."
      />

      <WhiteCard padding={2}>
        <Stack spacing={1.5}>
          <TextInput
            value={search}
            onChange={changeFilter<string>(setSearch)}
            placeholder="Search by name or email"
            ariaLabel="Search users"
            icon={<SearchRoundedIcon fontSize="small" />}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} sx={{ gap: 1.5 }}>
            <Box sx={{ flex: 2 }}>
              <SelectChips
                label="Who to show"
                options={TABS}
                value={tab}
                onChange={changeFilter<Tab>(setTab)}
              />
            </Box>
            <Box sx={{ flex: 4 }}>
              <SelectChips
                label="Status"
                options={STATUSES}
                value={status}
                onChange={changeFilter<StatusFilter>(setStatus)}
              />
            </Box>
          </Stack>
        </Stack>
      </WhiteCard>

      <WhiteCard padding={0} sx={{ overflow: 'hidden' }}>
        {users.isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : users.isError ? (
          <Message>Could not load users. Try again.</Message>
        ) : users.data.items.length === 0 ? (
          <Message>No users match these filters.</Message>
        ) : (
          <Box sx={{ opacity: users.isPlaceholderData ? 0.6 : 1 }}>
            <UsersTable
              users={users.data.items}
              treasurers={tab === 'treasurers'}
              compact={compact}
              phone={phone}
              wide={wide}
              busyId={
                setUserStatus.isPending
                  ? (setUserStatus.variables?.userId ?? null)
                  : null
              }
              onBlock={setToBlock}
              onUnblock={unblock}
            />
          </Box>
        )}

        <TablePager
          page={page}
          pageSize={pageSize}
          total={users.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={changeFilter<number>(setPageSize)}
        />
      </WhiteCard>

      <ConfirmDialog
        open={toBlock !== null}
        title={`Block ${toBlock ? fullName(toBlock) : ''}?`}
        description={
          <>
            They are logged out at once and can't log in, pay or move money
            until you unblock them.
            {blockingTreasurer && (
              <>
                {' '}
                Treasurer of {toBlock.classes.map((c) => c.name).join(', ')}:
                their fundraisers stay open. Block a fundraiser separately if
                needed.
              </>
            )}
          </>
        }
        confirmLabel="Block"
        destructive
        loading={setUserStatus.isPending}
        error={
          setUserStatus.isError ? 'Could not block the user. Try again.' : null
        }
        onConfirm={block}
        onClose={() => {
          setToBlock(null)
          setUserStatus.reset()
        }}
      />

      <AppSnackbar
        key={toast?.id}
        open={toast !== null}
        message={toast?.message ?? ''}
        severity={toast?.severity}
        variant="standard"
        onClose={() => setToast(null)}
      />
    </Stack>
  )
}

function Message({ children }: { children: string }) {
  return (
    <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
      {children}
    </Typography>
  )
}
