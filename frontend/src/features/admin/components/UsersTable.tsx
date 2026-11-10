import {
  Box,
  Button,
  ButtonBase,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'
import { Link as RouterLink } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import type { AdminUser } from '@/features/admin/api'
import { AccountStatusLabel } from '@/features/admin/components/AccountStatusLabel'
import { formatDate, formatFullDate } from '@/lib/dates'
import { fullName, initials, shortName } from '@/lib/names'

interface UsersTableProps {
  users: AdminUser[]
  /** Treasurers tab: their classes, and the name opens a chat with them */
  treasurers: boolean
  /** Narrow screens: short names, status letters, icon buttons, no "Joined" */
  compact: boolean
  /** Wide screens: dates with the year */
  wide: boolean
  /** The user whose status is being changed right now */
  busyId: string | null
  onBlock: (user: AdminUser) => void
  onUnblock: (user: AdminUser) => void
}

export function UsersTable({
  users,
  treasurers,
  compact,
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
        // same edges as the other lists in the app
        '& th:first-of-type, & td:first-of-type': { pl: { xs: 2, sm: 2.5 } },
        '& th:last-of-type, & td:last-of-type': { pr: { xs: 2, sm: 2.5 } },
      }}
    >
      <TableHead>
        <TableRow
          sx={{
            // like the children list on a class page: quiet, small caps
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
          <TableCell sx={{ width: compact ? 72 : 170 }}>
            {treasurers ? 'Classes' : 'Children'}
          </TableCell>
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
  wide,
  busy,
  onBlock,
  onUnblock,
}: {
  user: AdminUser
  treasurers: boolean
  compact: boolean
  wide: boolean
  busy: boolean
  onBlock: () => void
  onUnblock: () => void
}) {
  const name = fullName(user)
  const blocked = user.status === 'BLOCKED'
  // someone who never activated has no access to take away yet
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

      {!compact && (
        <TableCell sx={{ fontSize: 14 }}>
          {wide ? formatFullDate(user.created_at) : formatDate(user.created_at)}
        </TableCell>
      )}

      <TableCell>
        <AccountStatusLabel status={user.status} compact={compact} />
      </TableCell>

      <TableCell align="right">
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {canToggle &&
            (compact ? (
              <Tooltip title={blocked ? 'Unblock' : 'Block'}>
                <IconButton
                  onClick={blocked ? onUnblock : onBlock}
                  disabled={busy}
                  aria-label={`${blocked ? 'Unblock' : 'Block'} ${name}`}
                  size="small"
                  sx={iconButtonSx(blocked ? 'primary.main' : 'error.dark')}
                >
                  {blocked ? (
                    <LockOpenRoundedIcon fontSize="small" />
                  ) : (
                    <BlockRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            ) : (
              <Button
                onClick={blocked ? onUnblock : onBlock}
                disabled={busy}
                variant="outlined"
                size="small"
                sx={{
                  ...buttonSx,
                  color: blocked ? 'primary.main' : 'error.dark',
                  borderColor: blocked ? 'primary.main' : '#E8B4A2',
                }}
              >
                {blocked ? 'Unblock' : 'Block'}
              </Button>
            ))}
        </Stack>
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

const buttonSx = {
  minHeight: 36,
  borderRadius: 1,
  fontWeight: 600,
  textTransform: 'none',
  whiteSpace: 'nowrap',
} as const

function iconButtonSx(color: string) {
  return {
    width: 36,
    height: 36,
    borderRadius: 1,
    border: 1,
    borderColor: 'divider',
    color,
  }
}
