import { useState } from 'react'

import {
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import PersonRemoveOutlined from '@mui/icons-material/PersonRemoveOutlined'

import AppAvatar from '@/components/AppAvatar'
import WhiteCard from '@/components/WhiteCard'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import type { ClassMemberWithParent } from '@/features/classes/api'
import { formatDate } from '@/lib/dates'
import { shortName, fullName } from '@/lib/names.ts'
import EmptyState from '@/components/EmptyState'

// Shared by the header and the rows, so the labels stay above their column
const COLUMNS = {
  child: { flex: { xs: '3 1 0', sm: '1 1 0' }, minWidth: 0 },
  parent: { flex: { xs: '2 1 0', sm: '1 1 0' }, minWidth: 0 },
  joined: {
    flex: '0 0 auto',
    width: { xs: 52, sm: 72 },
    display: { xs: 'none', sm: 'none', md: 'block' },
  },
  remove: { flex: '0 0 auto', width: { xs: 34, md: 72 }, textAlign: 'right' },
} as const

interface ClassChildrenListProps {
  members: ClassMemberWithParent[]
  currentUserId?: string
  emptyText: string
  /** Show the Remove column (treasurer only) */
  showRemove?: boolean
  onRemove?: (member: ClassMemberWithParent) => void
}

export function ClassChildrenList({
  members,
  currentUserId,
  emptyText,
  showRemove = false,
  onRemove,
}: ClassChildrenListProps) {
  const FUNDRAISER_CHILDREN_LIMIT = 5
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('md'))

  const [showAll, setShowAll] = useState(false)

  if (members.length === 0) {
    return <EmptyState dashed description={emptyText} />
  }

  const visibleMembers = showAll
    ? members
    : members.slice(0, FUNDRAISER_CHILDREN_LIMIT)

  return (
    <WhiteCard padding={0}>
      <Stack
        direction="row"
        aria-hidden="true"
        sx={{
          columnGap: { xs: 1.5, sm: 2 },
          px: { xs: 2, sm: 2.5 },
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          color: 'text.secondary',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        <Box sx={COLUMNS.child}>Child</Box>
        <Box sx={COLUMNS.parent}>Parent</Box>
        <Box sx={COLUMNS.joined}>Joined</Box>
        {showRemove && <Box sx={COLUMNS.remove} />}
      </Stack>

      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {visibleMembers.map((member, index) => (
          <ChildRow
            key={member.id}
            member={member}
            isMine={member.parent.id === currentUserId}
            isFirst={index === 0}
            compact={compact}
            showRemove={showRemove}
            onRemove={onRemove}
          />
        ))}
      </Box>

      {members.length > FUNDRAISER_CHILDREN_LIMIT && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          <AppButtonOutlined
            label={showAll ? 'Show less' : `Show all (${members.length})`}
            onClick={() => setShowAll((prev) => !prev)}
          />
        </Box>
      )}
    </WhiteCard>
  )
}

function ChildRow({
  member,
  isMine,
  isFirst,
  compact,
  showRemove,
  onRemove,
}: {
  member: ClassMemberWithParent
  isMine: boolean
  isFirst: boolean
  compact: boolean
  showRemove: boolean
  onRemove?: (member: ClassMemberWithParent) => void
}) {
  const childFullName = fullName(member.child)
  const parentFullName = fullName(member.parent)

  return (
    <Stack
      component="li"
      direction="row"
      sx={{
        alignItems: 'center',
        columnGap: { xs: 1.5, sm: 2 },
        px: { xs: 2, sm: 2.5 },
        py: 1.5,
        borderTop: isFirst ? 0 : 1,
        borderColor: 'divider',
      }}
    >
      {/* Child */}
      <Stack
        direction="row"
        spacing={1.25}
        sx={{ ...COLUMNS.child, alignItems: 'center' }}
      >
        <AppAvatar
          name={childFullName}
          src={member.child.avatar_url}
          size={28}
        />
        <Typography sx={{ fontWeight: 600 }} noWrap title={childFullName}>
          {compact ? shortName(member.child) : childFullName}
        </Typography>
      </Stack>

      {/* Parent */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ ...COLUMNS.parent, alignItems: 'center' }}
      >
        {!compact && (
          <AppAvatar
            name={parentFullName}
            src={member.parent.avatar_url}
            size={28}
          />
        )}
        <Typography sx={{ fontSize: 14 }} noWrap title={parentFullName}>
          {isMine ? 'You' : compact ? shortName(member.parent) : parentFullName}
        </Typography>
      </Stack>

      <Typography
        noWrap
        sx={{ ...COLUMNS.joined, fontSize: 14, color: 'text.secondary' }}
      >
        {formatDate(member.joined_at ?? member.requested_at)}
      </Typography>

      {showRemove && (
        <Box sx={COLUMNS.remove}>
          {compact ? (
            <Tooltip title="Remove">
              <IconButton
                aria-label={`Remove ${childFullName}`}
                size="small"
                onClick={() => onRemove?.(member)}
                sx={{ color: 'error.dark' }}
              >
                <PersonRemoveOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              size="small"
              onClick={() => onRemove?.(member)}
              sx={{ color: 'error.dark', fontWeight: 500 }}
            >
              Remove
            </Button>
          )}
        </Box>
      )}
    </Stack>
  )
}
