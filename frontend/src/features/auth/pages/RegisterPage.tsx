import { Typography, Grid, Box, Divider, Stack } from '@mui/material'
import TextInput from '@/components/TextInput.tsx'
import { useNavigate } from 'react-router'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonIcon from '@mui/icons-material/Person'

import SideBanner from '@/features/auth/components/SideBanner.tsx'
import { useState } from 'react'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'
import AppButton from '@/components/AppButton.tsx'

export function RegisterPage() {
  const [fname, setFName] = useState('')
  const [lname, setLName] = useState('')
  const [email, setEmail] = useState('')
  const [password1, setPassword1] = useState('')
  const [password2, setPassword2] = useState('')

  const navigate = useNavigate()

  return (
    <Grid container spacing={2} sx={{ height: '100vh' }}>
      <SideBanner
        heroText={'Start with your class.'}
        descText={'Three steps and you can pay for the next trip.'}
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
              Create account
            </Typography>
            <Typography sx={{ fontSize: 14 }}>
              For parents and class treasurers.
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={6}>
              <TextInput
                value={fname}
                onChange={setFName}
                placeholder={'John'}
                name={email}
                icon={<PersonIcon fontSize="small" />}
              />
            </Grid>

            <Grid size={6}>
              <TextInput
                value={lname}
                onChange={setLName}
                placeholder={'Doe'}
                name={email}
                icon={<PersonIcon fontSize="small" />}
              />
            </Grid>
          </Grid>

          <TextInput
            value={email}
            onChange={setEmail}
            placeholder={'johndoe@example.com'}
            name={email}
            icon={<EmailRoundedIcon fontSize="small" />}
          />
          <TextInput
            value={password1}
            onChange={setPassword1}
            placeholder={'password'}
            password={true}
            name={email}
            icon={<LockRoundedIcon fontSize="small" />}
          />
          <TextInput
            value={password2}
            onChange={setPassword2}
            placeholder={'repeat password'}
            password={true}
            name={email}
            icon={<LockRoundedIcon fontSize="small" />}
          />

          <Box>
            <AppButton fullWidth={true} label={'Register'} />
          </Box>

          <Box>
            <Divider sx={{ color: 'text.secondary', fontSize: 14 }}>
              Already have an account?
            </Divider>
          </Box>

          <Box>
            <AppButtonOutlined
              fullWidth={true}
              label={'Sign in'}
              onClick={() => navigate('/login')}
            />
          </Box>
        </Stack>
      </Grid>
    </Grid>
  )
}
