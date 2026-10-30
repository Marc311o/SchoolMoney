import { Typography, Grid, Box, Divider, Stack } from '@mui/material'
import TextInput from '@/components/TextInput.tsx'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import { type SubmitEvent, useState } from 'react'
import AppButton from '@/components/AppButton.tsx'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'
import SideBanner from '@/features/auth/components/SideBanner.tsx'
import { useLocation, useNavigate } from 'react-router'
import { type ApiError, getFieldErrors } from '@/lib/api.ts'
import { useLogin } from '@/features/auth/api.ts'

type LoginErrors = {
  email?: string
  password?: string
  credentials?: boolean
}

function serverErrors(error: ApiError): LoginErrors {
  if (error.status === 401) {
    return { credentials: true, password: 'Invalid email or password' }
  }
  if (error.status === 403) {
    return { email: 'This account has been blocked' }
  }
  if (error.status === 422) return getFieldErrors(error)
  return { password: 'Something went wrong. Please try again.' }
}

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<LoginErrors>({})

  const login = useLogin()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  function validate(): boolean {
    const next: LoginErrors = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!email.includes('@')) next.email = 'Enter a valid email'
    if (!password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => navigate(from, { replace: true }),
        onError: (error) => setErrors(serverErrors(error)),
      },
    )
  }

  return (
    <Grid container spacing={2} sx={{ height: '100vh' }}>
      <SideBanner
        heroText={'Every class fundraiser, settled in one place.'}
        descText="Pay for trips and gifts, see who has paid, and keep every receipt where the whole class can find it."
      />

      {/*Form*/}
      <Grid
        size={{ xs: 12, sm: 6, md: 8 }}
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <Stack
          component="form"
          spacing={2}
          onSubmit={handleSubmit}
          noValidate
          sx={{ width: { xs: '80%', sm: '90%', md: '60%' } }}
        >
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
            name="email"
            icon={<EmailRoundedIcon fontSize="small" />}
            error={errors.credentials}
            errorText={errors.email}
            disabled={login.isPending}
          />
          <TextInput
            value={password}
            onChange={setPassword}
            placeholder={'password'}
            password
            name="password"
            icon={<LockRoundedIcon fontSize="small" />}
            errorText={errors.password}
            disabled={login.isPending}
          />

          <Box>
            <AppButton
              type="submit"
              fullWidth
              label={'Sign in'}
              loading={login.isPending}
            />
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
