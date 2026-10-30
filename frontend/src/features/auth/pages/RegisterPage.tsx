import { Typography, Grid, Box, Divider, Stack } from '@mui/material'
import TextInput from '@/components/TextInput.tsx'
import { useNavigate } from 'react-router'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonIcon from '@mui/icons-material/Person'

import SideBanner from '@/features/auth/components/SideBanner.tsx'
import { type SubmitEvent, useState } from 'react'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'
import AppButton from '@/components/AppButton.tsx'
import { useRegister } from '@/features/auth/api.ts'
import { getFieldErrors } from '@/lib/api.ts'

type RegisterErrors = Partial<
  Record<
    'first_name' | 'last_name' | 'email' | 'password' | 'password2',
    string
  >
>

export function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [errors, setErrors] = useState<RegisterErrors>({})

  const register = useRegister()
  const navigate = useNavigate()

  function validate(): boolean {
    const next: RegisterErrors = {}
    if (!firstName.trim()) next.first_name = 'First name is required'
    if (!lastName.trim()) next.last_name = 'Last name is required'
    if (!email.trim()) next.email = 'Email is required'
    else if (!email.includes('@')) next.email = 'Enter a valid email'
    if (password.length < 8) next.password = 'At least 8 characters'
    if (password2 !== password) next.password2 = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return

    register.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      },
      {
        onSuccess: () => navigate('/', { replace: true }),
        onError: (error) => {
          if (error.status === 409) {
            setErrors({ email: 'An account with this email already exists' })
          } else if (error.status === 422) {
            setErrors(getFieldErrors(error))
          } else {
            setErrors({
              password2: 'Something went wrong. Please try again.',
            })
          }
        },
      },
    )
  }

  return (
    <Grid container spacing={2} sx={{ height: '100vh' }}>
      <SideBanner
        heroText={'Start with your class.'}
        descText={'Three steps and you can pay for the next trip.'}
      />

      {/*Form*/}
      <Grid
        size={{ xs: 12, sm: 6, md: 8 }}
        component="form"
        onSubmit={handleSubmit}
        noValidate
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
                name="first_name"
                value={firstName}
                onChange={setFirstName}
                placeholder="First name"
                icon={<PersonIcon fontSize="small" />}
                errorText={errors.first_name}
                disabled={register.isPending}
              />
            </Grid>

            <Grid size={6}>
              <TextInput
                name="last_name"
                value={lastName}
                onChange={setLastName}
                placeholder="Last name"
                icon={<PersonIcon fontSize="small" />}
                errorText={errors.last_name}
                disabled={register.isPending}
              />
            </Grid>
          </Grid>

          <TextInput
            name="email"
            value={email}
            onChange={setEmail}
            placeholder="johndoe@example.com"
            icon={<EmailRoundedIcon fontSize="small" />}
            errorText={errors.email}
            disabled={register.isPending}
          />
          <TextInput
            name="password"
            value={password}
            onChange={setPassword}
            placeholder="Password (min. 8 characters)"
            password
            icon={<LockRoundedIcon fontSize="small" />}
            errorText={errors.password}
            disabled={register.isPending}
          />
          <TextInput
            name="password2"
            value={password2}
            onChange={setPassword2}
            placeholder="Repeat password"
            password
            icon={<LockRoundedIcon fontSize="small" />}
            errorText={errors.password2}
            disabled={register.isPending}
          />

          <Box>
            <AppButton
              type="submit"
              fullWidth
              label="Create account"
              loading={register.isPending}
            />
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
