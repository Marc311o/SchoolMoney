import {
  Box,
  ButtonBase,
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

import AppAvatar from '@/components/AppAvatar'
import type { AdminUser } from '@/features/admin/api'
import { AccountStatusLabel } from '@/features/admin/components/AccountStatusLabel'
import { BlockToggleButton } from '@/features/admin/components/BlockToggleButton'
import { formatDate, formatFullDate } from '@/lib/dates'
import { fullName, initials, shortName } from '@/lib/names'

interface UsersTableProps {
  users: AdminUser[]
  treasurers: boolean
  compact: boolean
  phone: boolean
  wide: boolean
  busyId: string | null
  onBlock: (user: AdminUser) => void
  onUnblock: (user: AdminUser) => void
}

export function UsersTable({
  users,
  treasurers,
  compact,
  phone,
  wide,
  busyId,
  onBlock,
  onUnblock,
}: UsersTableProps) {
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
          <TableCell>Name</TableCell>
          {!phone && (
            <TableCell sx={{ width: compact ? 72 : 170 }}>
              {treasurers ? 'Classes' : 'Children'}
            </TableCell>
          )}
          {!compact && (
            <TableCell sx={{ width: wide ? 140 : 100 }}>Joined</TableCell>
          )}
          <TableCell sx={{ width: compact ? 48 : 130 }}>
            {compact ? '' : 'Status'}
          </TableCell>
          <TableCell align="right" sx={{ width: compact ? 64 : 130 }}>
            {compact ? '' : 'Actions'}
          </TableCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {users.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            treasurers={treasurers}
            compact={compact}
            phone={phone}
            wide={wide}
            busy={busyId === user.id}
            onBlock={() => onBlock(user)}
            onUnblock={() => onUnblock(user)}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function UserRow({
  user,
  treasurers,
  compact,
  phone,
  wide,
  busy,
  onBlock,
  onUnblock,
}: {
  user: AdminUser
  treasurers: boolean
  compact: boolean
  phone: boolean
  wide: boolean
  busy: boolean
  onBlock: () => void
  onUnblock: () => void
}) {
  const name = fullName(user)
  const blocked = user.status === 'BLOCKED'
  const canToggle = user.status !== 'PENDING_ACTIVATION'
  const canMessage = treasurers && !blocked

  return (
    <TableRow sx={{ bgcolor: blocked ? '#FCF7F5' : undefined }}>
      <TableCell>
        {canMessage ? (
          <Tooltip title={`Message ${name}`}>
            <ButtonBase
              component={RouterLink}
              to={`/admin/messages?treasurer=${user.id}`}
              sx={{
                maxWidth: '100%',
                justifyContent: 'flex-start',
                m: -0.75,
                p: 0.75,
                borderRadius: 1,
                textAlign: 'left',
                '&:hover': { bgcolor: 'action.hover' },
                '&:hover .user-name': { textDecoration: 'underline' },
              }}
            >
              <NameCell user={user} compact={compact} />
            </ButtonBase>
          </Tooltip>
        ) : (
          <NameCell user={user} compact={compact} />
        )}
      </TableCell>

      {!phone && (
        <TableCell sx={{ fontSize: 14 }}>
          {treasurers ? (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
              {user.classes.map((schoolClass) => (
                <Box
                  key={schoolClass.id}
                  component="span"
                  sx={{
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 999,
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: '20px',
                  }}
                >
                  {schoolClass.name}
                </Box>
              ))}
            </Stack>
          ) : (
            <ChildrenCount list={user.children} />
          )}
        </TableCell>
      )}

      {!compact && (
        <TableCell sx={{ fontSize: 14 }}>
          {wide ? formatFullDate(user.created_at) : formatDate(user.created_at)}
        </TableCell>
      )}

      <TableCell>
        <AccountStatusLabel status={user.status} compact={compact} />
      </TableCell>

      <TableCell align="right">
        {canToggle && (
          <BlockToggleButton
            blocked={blocked}
            name={name}
            compact={compact}
            disabled={busy}
            onBlock={onBlock}
            onUnblock={onUnblock}
          />
        )}
      </TableCell>
    </TableRow>
  )
}

/** Avatar, name and email */
function NameCell({ user, compact }: { user: AdminUser; compact: boolean }) {
  const name = fullName(user)

  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={{ alignItems: 'center', minWidth: 0 }}
    >
      <AppAvatar
        name={name}
        src={user.avatar_url}
        label={initials(name)}
        size={compact ? 32 : 36}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          className="user-name"
          noWrap
          title={compact ? name : undefined}
          sx={{ fontWeight: 600, fontSize: 15 }}
        >
          {compact ? shortName(user) : name}
        </Typography>
        {!compact && (
          <Typography noWrap sx={{ fontSize: 13, color: 'text.secondary' }}>
            {user.email}
          </Typography>
        )}
      </Box>
    </Stack>
  )
}

/** The number of children; their names in a tooltip */
function ChildrenCount({ list }: { list: AdminUser['children'] }) {
  if (list.length === 0) return <>0</>

  return (
    <Tooltip
      title={
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          {list.map((child) => (
            <li key={child.id}>{fullName(child)}</li>
          ))}
        </Box>
      }
    >
      {/* focusable, so the names can be read without a mouse too */}
      <Box
        component="span"
        tabIndex={0}
        aria-label={`${list.length} children: ${list.map(fullName).join(', ')}`}
        sx={{
          cursor: 'default',
          borderBottom: '1px dotted',
          borderColor: 'text.secondary',
        }}
      >
        {list.length}
      </Box>
    </Tooltip>
  )
}
