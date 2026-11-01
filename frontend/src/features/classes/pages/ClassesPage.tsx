import { Box, CircularProgress, Stack, Typography, Grid } from '@mui/material'
import { useNavigate } from 'react-router'

import AppButtonOutlined from '@/components/AppButtonOutlined'
import WhiteCard from '@/components/WhiteCard'
import { useClasses } from '@/features/classes/api'
import { ClassCard } from '@/features/classes/components/ClassCard'
import AppButton from '@/components/AppButton.tsx'

export function ClassesPage() {
  const { data: classes = [], isPending, isError } = useClasses()
  const navigate = useNavigate()

  return (
    <Stack spacing={4} sx={{ p: '1em' }}>
      <Stack
        direction="row"
        sx={{
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            sx={{
              fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
              fontSize: { xs: 28, md: 36 },
              fontWeight: 700,
            }}
          >
            Classes
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Classes your children are in, and the ones you run as treasurer.
          </Typography>
        </Box>
        {classes.length > 0 && (
          <Grid container spacing={2}>
            <AppButtonOutlined label="Join with a code" />
            <AppButton label="New class" />
          </Grid>
        )}
      </Stack>
      {isPending ? (
        <CircularProgress sx={{ alignSelf: 'center' }} />
      ) : isError ? (
        <Typography color="error">Could not load your classes.</Typography>
      ) : classes.length === 0 ? (
        <WhiteCard
          sx={{
            bgcolor: 'transparent',
            borderStyle: 'dashed',
            borderWidth: '2px',
          }}
        >
          <Stack
            spacing={1.5}
            sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}
          >
            <Typography component="h2" sx={{ fontSize: 22, fontWeight: 700 }}>
              You're not in any class yet
            </Typography>
            <Typography sx={{ maxWidth: 440, color: 'text.secondary' }}>
              Ask your class treasurer for the access code, then join from your
              child's card.
            </Typography>
            <Grid spacing={2} container>
              <AppButtonOutlined
                label="Go to My children"
                onClick={() => navigate('/children')}
              />
              <AppButton label="Create new class" />
            </Grid>
          </Stack>
        </WhiteCard>
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
