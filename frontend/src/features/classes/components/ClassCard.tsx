import { Box, Divider, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import { Link as RouterLink } from 'react-router'

import AppAvatar from '@/components/AppAvatar'
import WhiteCard from '@/components/WhiteCard'
import {
  type ClassListItem,
  type ClassMember,
  canOpenClass,
  isWaitingForApproval,
} from '@/features/classes/api'

interface ClassCardProps {
  schoolClass: ClassListItem
}

export function ClassCard({ schoolClass }: ClassCardProps) {
  const isTreasurer = schoolClass.my_role === 'TREASURER'
  const canOpen = canOpenClass(schoolClass)
  const treasurerName = `${schoolClass.treasurer.first_name} ${schoolClass.treasurer.last_name}`
  const isWaiting = isWaitingForApproval(schoolClass)

  const content = (
    <WhiteCard sx={{ opacity: isWaiting ? 0.8 : 1 }}>
      <Stack spacing={2.25} sx={{ height: '100%' }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {schoolClass.name}
            </Typography>
            {schoolClass.school_name && (
              <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                {schoolClass.school_name}
              </Typography>
            )}
          </Box>
          {isTreasurer && <Badge>Treasurer</Badge>}
          {!canOpen && <Badge>Waiting</Badge>}
        </Stack>

        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <AppAvatar
            name={treasurerName}
            src={schoolClass.treasurer.avatar_url}
            size={36}
          />
          <Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Treasurer
            </Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
              {isTreasurer ? 'You' : treasurerName}
            </Typography>
          </Box>
        </Stack>

        {schoolClass.my_children.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {schoolClass.my_children.map((member) => (
              <ChildChip key={member.id} member={member} />
            ))}
          </Stack>
        )}

        <Box sx={{ mt: 'auto' }}>
          <Divider sx={{ mb: 1.75 }} />
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            {canOpen
              ? childrenCount(schoolClass.children_count)
              : `You'll see the class once the treasurer approves ${firstNames(schoolClass.my_children)}.`}
          </Typography>
        </Box>
      </Stack>
    </WhiteCard>
  )

  if (!canOpen) {
    return <Box sx={{ display: 'grid', opacity: 0.85 }}>{content}</Box>
  }

  return (
    <Box
      component={RouterLink}
      to={`/classes/${schoolClass.id}`}
      aria-label={`Class ${schoolClass.name}`}
      sx={{
        display: 'grid',
        color: 'inherit',
        textDecoration: 'none',
        borderRadius: 1,
        '& > *': { transition: 'border-color 150ms' },
        '&:hover > *': { borderColor: 'primary.main' },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: 2,
        },
      }}
    >
      {content}
    </Box>
  )
}

function ChildChip({ member }: { member: ClassMember }) {
  const name = `${member.child.first_name} ${member.child.last_name}`

  return (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        alignItems: 'center',
        height: 32,
        pl: 0.5,
        pr: 1.5,
        borderRadius: 999,
        bgcolor: 'background.default',
      }}
    >
      <AppAvatar name={name} src={member.child.avatar_url} size={24} />
      <Typography sx={{ fontSize: 14 }}>{member.child.first_name}</Typography>
    </Stack>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <Typography
      component="span"
      sx={{
        flex: 'none',
        px: 1.25,
        py: 0.25,
        borderRadius: 999,
        bgcolor: 'warning.light',
        color: 'warning.dark',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </Typography>
  )
}

function childrenCount(count: number): string {
  return count === 1 ? '1 child' : `${count} children`
}

function firstNames(members: ClassMember[]): string {
  return members.map((member) => member.child.first_name).join(' and ')
}
