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
  type AdminFundraiser,
  type FundraiserFilters,
  useAdminFundraisers,
  useSetFundraiserBlocked,
} from '@/features/admin/api'
import {
  FundraisersTable,
  type FundraisersTableSize,
} from '@/features/admin/components/FundraisersTable'
import { formatMoney } from '@/lib/money'

type Show = FundraiserFilters['show']

const SHOW: SelectChipOption<Show>[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'BLOCKED', label: 'Blocked' },
]

const SEARCH_DELAY_MS = 300
const FULL_TABLE_FROM = 1450

export function AdminFundraisersPage() {
  const theme = useTheme()
  const phone = useMediaQuery(theme.breakpoints.down('sm'))
  const narrow = useMediaQuery(theme.breakpoints.down('md'))
  const roomy = useMediaQuery(theme.breakpoints.up(FULL_TABLE_FROM))
  const size: FundraisersTableSize = phone
    ? 'phone'
    : narrow
      ? 'compact'
      : roomy
        ? 'full'
        : 'medium'

  const [show, setShow] = useState<Show>('ALL')
  const [search, setSearch] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [toBlock, setToBlock] = useState<AdminFundraiser | null>(null)
  const [toast, setToast] = useState<{
    message: string
    severity: SnackbarSeverity
    id: number
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setQ(search), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  const fundraisers = useAdminFundraisers({ q, show, page, pageSize })
  const setBlocked = useSetFundraiserBlocked()

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
    setBlocked.mutate(
      { fundraiserId: toBlock.id, blocked: true },
      {
        onSuccess: () => {
          notify(`“${toBlock.name}” is blocked`)
          setToBlock(null)
        },
      },
    )
  }

  const unblock = (fundraiser: AdminFundraiser) =>
    setBlocked.mutate(
      { fundraiserId: fundraiser.id, blocked: false },
      {
        onSuccess: () => notify(`“${fundraiser.name}” takes payments again`),
        onError: () => notify('Could not unblock the fundraiser', 'error'),
      },
    )

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      <PageHeader
        title="Fundraisers"
        subtitle="All fundraisers in every class. A blocked fundraiser takes no payments, refunds or withdrawals."
      />

      <WhiteCard padding={2}>
        <Stack spacing={1.5}>
          <TextInput
            value={search}
            onChange={changeFilter<string>(setSearch)}
            placeholder="Search by fundraiser, class or treasurer"
            ariaLabel="Search fundraisers"
            icon={<SearchRoundedIcon fontSize="small" />}
          />
          <SelectChips
            label="Which fundraisers to show"
            options={SHOW}
            value={show}
            onChange={changeFilter<Show>(setShow)}
          />
        </Stack>
      </WhiteCard>

      <WhiteCard padding={0} sx={{ overflow: 'hidden' }}>
        {fundraisers.isPending ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : fundraisers.isError ? (
          <Message>Could not load fundraisers. Try again.</Message>
        ) : fundraisers.data.items.length === 0 ? (
          <Message>No fundraisers match these filters.</Message>
        ) : (
          <Box sx={{ opacity: fundraisers.isPlaceholderData ? 0.6 : 1 }}>
            <FundraisersTable
              fundraisers={fundraisers.data.items}
              size={size}
              busyId={
                setBlocked.isPending
                  ? (setBlocked.variables?.fundraiserId ?? null)
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
          total={fundraisers.data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={changeFilter<number>(setPageSize)}
        />
      </WhiteCard>

      <ConfirmDialog
        open={toBlock !== null}
        title={`Block “${toBlock?.name ?? ''}”?`}
        description={
          <>
            Parents can't pay into it and the treasurer can't edit it, withdraw
            or refund until you unblock it.{' '}
            {toBlock && `${formatMoney(toBlock.balance)} PLN`} stays on the
            fundraiser account. Nothing is refunded.
          </>
        }
        confirmLabel="Block fundraiser"
        destructive
        loading={setBlocked.isPending}
        error={
          setBlocked.isError
            ? 'Could not block the fundraiser. Try again.'
            : null
        }
        onConfirm={block}
        onClose={() => {
          setToBlock(null)
          setBlocked.reset()
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
