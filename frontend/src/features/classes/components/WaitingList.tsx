import { Box, Stack, Typography } from '@mui/material'

import AppAvatar from '@/components/AppAvatar'
import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import EmptyState from '@/components/EmptyState'
import WhiteCard from '@/components/WhiteCard'
import type { ClassMemberWithParent } from '@/features/classes/api'
import { timeAgo } from '@/lib/dates'
import { fullName } from '@/lib/names'

interface WaitingListProps {
  members: ClassMemberWithParent[]
  onApprove?: (member: ClassMemberWithParent) => void
  onReject?: (member: ClassMemberWithParent) => void
}

export function WaitingList({
  members,
  onApprove,
  onReject,
}: WaitingListProps) {
  if (members.length === 0) {
    return <EmptyState description="No pending requests." />
  }

  return (
    <Stack spacing={1.5}>
      {members.map((member) => {
        const childName = fullName(member.child)
        const parentName = fullName(member.parent)

        return (
          <WhiteCard
            key={member.id}
            padding={2}
            sx={{ bgcolor: 'warning.light', borderColor: 'warning.main' }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 2 }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', flex: '1 1 260px', minWidth: 0 }}
              >
                <AppAvatar
                  name={childName}
                  src={member.child.avatar_url}
                  size={40}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }} noWrap>
                    {childName}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    Parent: {parentName} · joined with code{' '}
                    {timeAgo(member.requested_at)}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1.25} component="span">
                <AppButtonOutlined
                  label="Reject"
                  onClick={() => onReject?.(member)}
                />
                <AppButton
                  label="Approve"
                  onClick={() => onApprove?.(member)}
                />
              </Stack>
            </Stack>
          </WhiteCard>
        )
      })}
    </Stack>
  )
}
