import { Button, Stack, Tooltip, Typography } from '@mui/material'

import type { ClassMemberWithParent } from '@/features/classes/api'

interface LeaveClassSectionProps {
  /** My own ACTIVE children in this class */
  myChildren: ClassMemberWithParent[]
  className: string
  onLeave: (member: ClassMemberWithParent) => void
}
export function LeaveClassSection({
  myChildren,
  className,
  onLeave,
}: LeaveClassSectionProps) {
  if (myChildren.length === 0) return null

  return (
    <Stack
      component="section"
      aria-labelledby="leave-class-title"
      spacing={0.75}
      sx={{ mt: '20px', pt: 7, borderTop: 1, borderColor: 'divider' }}
    >
      <Typography
        id="leave-class-title"
        component="h2"
        sx={{ fontSize: 14, fontWeight: 600, color: 'text.secondary' }}
      >
        Leave the class
      </Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', maxWidth: 560 }}>
        Your child stops being a member of {className}. Payments already made
        stay in your history, and you can join again with the access code.
      </Typography>

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, ml: -1 }}>
        {myChildren.map((member) => (
          <Tooltip
            key={member.id}
            title={member.child.first_name + ' ' + member.child.last_name}
          >
            <Button
              key={member.id}
              size="small"
              onClick={() => onLeave(member)}
              sx={{ color: 'error.dark', fontWeight: 500, px: 1 }}
            >
              Remove {member.child.first_name} from the class
            </Button>
          </Tooltip>
        ))}
      </Stack>
    </Stack>
  )
}
