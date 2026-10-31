import { Box, Button, Divider, Stack, Typography } from '@mui/material'

import AppAvatar from '@/components/AppAvatar'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import WhiteCard from '@/components/WhiteCard'
import type { Child, ChildClass } from '@/features/children/api'
import { ageInYears, formatBirthDate } from '@/features/children/utils'

interface ChildCardProps {
  child: Child
  onEdit: (child: Child) => void
  onRemove: (child: Child) => void
}

export function ChildCard({ child, onEdit, onRemove }: ChildCardProps) {
  const fullName = `${child.first_name} ${child.last_name}`
  const age = ageInYears(child.birth_date)

  return (
    <WhiteCard>
      <Stack spacing={2.25} sx={{ height: '100%' }}>
        <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center' }}>
          <AppAvatar name={fullName} src={child.avatar_url} />
          <Box sx={{ minWidth: 0 }}>
            <Typography component="h2" sx={{ fontSize: 18, fontWeight: 600 }}>
              {fullName}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Born {formatBirthDate(child.birth_date)} · {age}{' '}
              {age === 1 ? 'year' : 'years'}
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: 'divider' }} />

        <ClassInfo schoolClass={child.school_class} />

        <Divider sx={{ borderColor: 'divider' }} />

        <Stack direction="row-reverse" spacing={1} sx={{ mt: 'auto' }}>
          <Button
            onClick={() => onRemove(child)}
            sx={{ color: 'error.dark', fontWeight: 500, minHeight: 40 }}
          >
            Remove
          </Button>
          <AppButtonOutlined label="Edit" onClick={() => onEdit(child)} />
        </Stack>
      </Stack>
    </WhiteCard>
  )
}

function ClassInfo({ schoolClass }: { schoolClass: ChildClass | null }) {
  if (!schoolClass) {
    return (
      <Stack
        spacing={1.25}
        sx={{
          alignItems: 'flex-start',
          p: 1.5,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Not in a class yet.
        </Typography>
        {/* TODO: open the "join with a code" flow when classes are ready */}
        <Button
          size="small"
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.dark',
            fontWeight: 600,
            px: 1.75,
          }}
        >
          Join with a code
        </Button>
      </Stack>
    )
  }

  const isMember = schoolClass.status === 'ACTIVE'

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        bgcolor: isMember ? 'transparent' : 'warning.light',
        borderRadius: 1,
        p: 1.5,
      }}
    >
      <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>
        Class {schoolClass.name}
      </Typography>

      <Typography
        sx={{
          fontWeight: 600,
          color: isMember ? 'primary.main' : 'warning.dark',
          bgcolor: isMember ? 'transparent' : 'warning.light',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          fontSize: 13,
        }}
      >
        {isMember ? 'Member' : 'Waiting'}
      </Typography>
    </Stack>
  )
}
