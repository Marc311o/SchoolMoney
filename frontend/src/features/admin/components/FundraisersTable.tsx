import {
  Box,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router'

import type { AdminFundraiser } from '@/features/admin/api'
import { BlockToggleButton } from '@/features/admin/components/BlockToggleButton'
import { FundraiserStatusLabel } from '@/features/admin/components/FundraiserStatusLabel'
import { formatDate, formatFullDate } from '@/lib/dates'
import { formatMoney, formatMoneyShort } from '@/lib/money'
import { fullName, shortName } from '@/lib/names'

export type FundraisersTableSize = 'phone' | 'compact' | 'medium' | 'full'

interface FundraisersTableProps {
  fundraisers: AdminFundraiser[]
  size: FundraisersTableSize
  busyId: string | null
  onBlock: (fundraiser: AdminFundraiser) => void
  onUnblock: (fundraiser: AdminFundraiser) => void
}

export function FundraisersTable({
  fundraisers,
  size,
  busyId,
  onBlock,
  onUnblock,
}: FundraisersTableProps) {
  const phone = size === 'phone'
  const compact = phone || size === 'compact'
  const tight = size !== 'full'

  return (
    <Table
      size={compact ? 'small' : 'medium'}
      sx={{
        tableLayout: 'fixed',
        '& th:first-of-type, & td:first-of-type': { pl: { xs: 2, sm: 2.5 } },
        '& th:last-of-type, & td:last-of-type': { pr: { xs: 2, sm: 2.5 } },
      }}
    >
      <TableHead>
        <TableRow
          sx={{
            '& th': {
              py: 1.25,
              color: 'text.secondary',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.06em',
              lineHeight: '18px',
              textTransform: 'uppercase',
              borderColor: 'divider',
            },
          }}
        >
          <TableCell>Fundraiser</TableCell>
          {!compact && <TableCell sx={{ width: 170 }}>Treasurer</TableCell>}
          {!phone && (
            <>
              <TableCell sx={{ width: tight ? 64 : 130 }}>Paid</TableCell>
              <TableCell align="right" sx={{ width: compact ? 64 : 130 }}>
                {compact ? 'PLN' : 'On account'}
              </TableCell>
            </>
          )}
          <TableCell sx={{ width: tight ? 72 : 180 }}>
            {tight ? '' : 'Status'}
          </TableCell>
          <TableCell align="right" sx={{ width: compact ? 60 : 120 }}>
            {compact ? '' : 'Action'}
          </TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {fundraisers.map((fundraiser) => (
          <FundraiserRow
            key={fundraiser.id}
            fundraiser={fundraiser}
            size={size}
            busy={busyId === fundraiser.id}
            onBlock={() => onBlock(fundraiser)}
            onUnblock={() => onUnblock(fundraiser)}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function FundraiserRow({
  fundraiser,
  size,
  busy,
  onBlock,
  onUnblock,
}: {
  fundraiser: AdminFundraiser
  size: FundraisersTableSize
  busy: boolean
  onBlock: () => void
  onUnblock: () => void
}) {
  const phone = size === 'phone'
  const compact = phone || size === 'compact'
  const tight = size !== 'full'
  const { school_class: schoolClass } = fundraiser
  const blocked = fundraiser.is_blocked
  const ends =
    size === 'full'
      ? formatFullDate(fundraiser.end_date)
      : formatDate(fundraiser.end_date)
  const paid = `${fundraiser.paid_count} / ${fundraiser.children_count} children`
  const share =
    fundraiser.children_count === 0
      ? 0
      : (fundraiser.paid_count / fundraiser.children_count) * 100

  return (
    <TableRow sx={{ bgcolor: blocked ? '#FCF7F5' : undefined }}>
      <TableCell>
        <Typography
          noWrap
          title={fundraiser.name}
          sx={{ fontWeight: 600, fontSize: 15 }}
        >
          {fundraiser.name}
        </Typography>
        <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
          {compact ? (
            <>
              {schoolClass.name} ·{' '}
              <TreasurerLink fundraiser={fundraiser} short />
            </>
          ) : (
            `Class ${schoolClass.name} · ends ${ends}`
          )}
        </Typography>
      </TableCell>

      {!compact && (
        <TableCell sx={{ fontSize: 14 }}>
          <TreasurerLink fundraiser={fundraiser} />
        </TableCell>
      )}

      {!phone && (
        <>
          <TableCell sx={{ fontSize: 13 }}>
            {tight ? (
              <Tooltip title={paid}>
                <span>
                  {fundraiser.paid_count}/{fundraiser.children_count}
                </span>
              </Tooltip>
            ) : (
              <Stack spacing={0.5}>
                <span>{paid}</span>
                <Box
                  aria-hidden="true"
                  sx={{
                    height: 4,
                    borderRadius: 999,
                    bgcolor: 'background.default',
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${share}%`,
                      height: '100%',
                      bgcolor: blocked ? '#C9A396' : 'primary.main',
                    }}
                  />
                </Box>
              </Stack>
            )}
          </TableCell>

          <TableCell
            align="right"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            {compact ? (
              <Tooltip title={`${formatMoney(fundraiser.balance)} PLN`}>
                <span>{formatMoneyShort(fundraiser.balance)}</span>
              </Tooltip>
            ) : (
              `${formatMoney(fundraiser.balance)} PLN`
            )}
          </TableCell>
        </>
      )}

      <TableCell>
        <FundraiserStatusLabel
          status={fundraiser.status}
          blocked={blocked}
          compact={tight}
        />
      </TableCell>

      <TableCell align="right">
        <BlockToggleButton
          blocked={blocked}
          name={fundraiser.name}
          compact={compact}
          disabled={busy}
          onBlock={onBlock}
          onUnblock={onUnblock}
        />
      </TableCell>
    </TableRow>
  )
}

/** The treasurer's name; opens the admin's chat with them */
function TreasurerLink({
  fundraiser,
  short = false,
}: {
  fundraiser: AdminFundraiser
  short?: boolean
}) {
  const treasurer = fundraiser.school_class.treasurer
  const name = fullName(treasurer)

  return (
    <Tooltip title={`Message ${name}`}>
      <Link
        component={RouterLink}
        to={`/admin/messages?treasurer=${treasurer.id}`}
        underline="hover"
        sx={{ fontWeight: 500 }}
      >
        {short ? shortName(treasurer) : name}
      </Link>
    </Tooltip>
  )
}
