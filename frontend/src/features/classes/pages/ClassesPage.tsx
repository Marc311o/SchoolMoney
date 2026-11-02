import { Box, CircularProgress, Typography, Stack } from '@mui/material'
import { useNavigate } from 'react-router'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import { useClasses } from '@/features/classes/api'
import { ClassCard } from '@/features/classes/components/ClassCard'

export function ClassesPage() {
  const { data: classes = [], isPending, isError } = useClasses()
  const navigate = useNavigate()

  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <PageHeader
        title="Classes"
        subtitle="Classes your children are in, and the ones you run as treasurer."
        actions={
          classes.length > 0 && (
            <>
              {/* TODO: wire up when the endpoints exist */}
              <AppButtonOutlined label="Join with a code" />
              <AppButton label="New class" />
            </>
          )
        }
      />

      {isPending ? (
        <CircularProgress sx={{ alignSelf: 'center' }} />
      ) : isError ? (
        <Typography color="error">Could not load your classes.</Typography>
      ) : classes.length === 0 ? (
        <EmptyState
          dashed
          title="You're not in any class yet"
          description="Ask your class treasurer for the access code, then join from your child's card."
          actions={
            <>
              <AppButtonOutlined
                label="Go to My children"
                onClick={() => navigate('/children')}
              />
              <AppButton label="Create new class" />
            </>
          }
        />
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns:
              'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
          }}
        >
          {classes.map((schoolClass) => (
            <ClassCard key={schoolClass.id} schoolClass={schoolClass} />
          ))}
        </Box>
      )}
    </Stack>
  )
}
