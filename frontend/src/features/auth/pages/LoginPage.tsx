import { Typography, Grid, Box, Divider, Stack } from '@mui/material'
import TextInput from '@/components/TextInput.tsx'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import { useState } from 'react'
import AppButton from '@/components/AppButton.tsx'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'
import SideBanner from '@/features/auth/components/SideBanner.tsx'
import { useNavigate } from 'react-router'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  return (
    <Grid container spacing={2} sx={{ height: '100vh' }}>
      <SideBanner
        heroText={'Every class fundraiser, settled in one place.'}
        descText={
          'Pay for trips and gifts, see who has paid, and keep every receipt\n' +
          '            where the whole class can find it.'
        }
      />

      {/*Form*/}
      <Grid
        size={{ xs: 12, sm: 6, md: 8 }}
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <Stack spacing={2} sx={{ width: { xs: '80%', sm: '90%', md: '60%' } }}>
          <Box sx={{ marginBottom: '20px' }}>
            <Typography
              sx={{
                paddingTop: '1em',
                fontFamily: 'Bricolage Grotesque, Segoe UI, sans-serif',
                fontSize: { xs: '5vw', sm: '5vw', md: '4vw' },
                fontWeight: '700',
              }}
            >
              Sign Up
            </Typography>
            <Typography sx={{ fontSize: 14 }}>
              Welcome back. Use the email you registered with.
            </Typography>
          </Box>

          <TextInput
            value={email}
            onChange={setEmail}
            placeholder={'johndoe@example.com'}
            name={email}
            icon={<EmailRoundedIcon fontSize="small" />}
          />
          <TextInput
            value={password}
            onChange={setPassword}
            placeholder={'password'}
            name={email}
            icon={<LockRoundedIcon fontSize="small" />}
          />

          <Box>
            <AppButton fullWidth={true} label={'Sign in'} />
          </Box>

          <Box>
            <Divider sx={{ color: 'text.secondary', fontSize: 14 }}>
              New to SchoolMoney?
            </Divider>
          </Box>

          <Box>
            <AppButtonOutlined
              fullWidth={true}
              label={'Create an account'}
              onClick={() => navigate('/register')}
            />
          </Box>
        </Stack>
      </Grid>
    </Grid>
  )
}
