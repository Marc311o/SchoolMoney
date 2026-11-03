import { useState, type SubmitEvent } from 'react'

import { Alert, Box, Divider, Grid, Stack, Typography } from '@mui/material'

import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import UpdateRoundedIcon from '@mui/icons-material/UpdateRounded'

import AppAvatar from '@/components/AppAvatar'
import TextInput from '@/components/TextInput'
import AppButton from '@/components/AppButton'
import WhiteCard from '@/components/WhiteCard'
import UserStatusChip from '@/components/UserStatusChip'
import PageHeader from '@/components/PageHeader'
import { BankAccountsCard } from '@/features/wallet/components/BankAccountsCard'

import { type ApiError, getFieldErrors } from '@/lib/api'

import {
  useCurrentUser,
  useUpdateProfile,
  useChangePassword,
  type User,
} from '@/features/settings/api'

type ProfileErrors = {
  first_name?: string
  last_name?: string
}

type PasswordErrors = {
  current_password?: string
  new_password?: string
  confirm_password?: string
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-EN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getProfileErrors(error: ApiError): ProfileErrors {
  if (error.status === 422) return getFieldErrors(error)

  return {
    first_name: 'Something went wrong. Please try again.',
  }
}

function getPasswordErrors(error: ApiError): PasswordErrors {
  if (error.status === 422) return getFieldErrors(error)

  if (error.status === 401) {
    return {
      current_password: 'Current password is incorrect',
    }
  }

  return {
    new_password: 'Something went wrong. Please try again.',
  }
}

export function SettingsPage() {
  const { data: user, isPending, isError } = useCurrentUser()

  return (
    <Stack component="div" sx={{ gap: 4, p: '1em' }}>
      <PageHeader
        title="Settings"
        subtitle="Manage your account information and security settings."
      />

      {isPending ? (
        <Typography color="text.secondary">Loading settings...</Typography>
      ) : isError || !user ? (
        <Alert severity="error">Could not load user information.</Alert>
      ) : (
        <SettingsContent key={user.id} user={user} />
      )}
    </Stack>
  )
}

function SettingsContent({ user }: { user: User }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const [firstName, setFirstName] = useState(user.first_name)
  const [lastName, setLastName] = useState(user.last_name)

  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({})
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({})
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  function handleProfileSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: ProfileErrors = {}

    if (!firstName.trim()) {
      errors.first_name = 'First name is required'
    }

    if (!lastName.trim()) {
      errors.last_name = 'Last name is required'
    }

    setProfileErrors(errors)
    setProfileSuccess(false)

    if (Object.keys(errors).length > 0) return

    updateProfile.mutate(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      },
      {
        onSuccess: () => {
          setProfileSuccess(true)
          setProfileErrors({})
        },
        onError: (error) => {
          setProfileErrors(getProfileErrors(error))
        },
      },
    )
  }

  function handlePasswordSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: PasswordErrors = {}

    if (!currentPassword) {
      errors.current_password = 'Current password is required'
    }

    if (!newPassword) {
      errors.new_password = 'New password is required'
    } else if (newPassword.length < 8) {
      errors.new_password = 'Password must contain at least 8 characters'
    }

    if (!confirmPassword) {
      errors.confirm_password = 'Please confirm your new password'
    } else if (newPassword !== confirmPassword) {
      errors.confirm_password = 'Passwords do not match'
    }

    if (currentPassword && currentPassword === newPassword) {
      errors.new_password = 'New password must be different'
    }

    setPasswordErrors(errors)
    setPasswordSuccess(false)

    if (Object.keys(errors).length > 0) return

    changePassword.mutate(
      {
        current_password: currentPassword,
        new_password: newPassword,
      },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setPasswordErrors({})
          setPasswordSuccess(true)
        },
        onError: (error) => {
          setPasswordErrors(getPasswordErrors(error))
        },
      },
    )
  }

  return (
    <Grid container spacing={3}>
      {/* Account information */}
      <Grid size={{ xs: 12, md: 5 }}>
        <WhiteCard padding={3}>
          <Stack component="div" sx={{ gap: 3 }}>
            <Stack
              component="div"
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <AppAvatar
                name={`${user.first_name} ${user.last_name}`}
                src={user.avatar_url}
                size={44}
              />

              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Account information
              </Typography>
            </Stack>

            <Divider />

            <Stack component="div" sx={{ gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Full name
                </Typography>

                <Stack
                  component="div"
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <PersonRoundedIcon fontSize="small" color="action" />

                  <Typography sx={{ fontWeight: 600 }}>
                    {user.first_name} {user.last_name}
                  </Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Email address
                </Typography>

                <Stack
                  component="div"
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <EmailRoundedIcon fontSize="small" color="action" />

                  <Typography sx={{ fontWeight: 600 }}>{user.email}</Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account role
                </Typography>

                <Box>
                  <UserStatusChip label={user.role} />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Account status
                </Typography>

                <Box>
                  <UserStatusChip label={user.status} />
                </Box>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Member since
                </Typography>

                <Stack
                  component="div"
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <CalendarMonthRoundedIcon fontSize="small" color="action" />

                  <Typography sx={{ fontWeight: 600 }}>
                    {formatDate(user.created_at)}
                  </Typography>
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Last profile update
                </Typography>

                <Stack
                  component="div"
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <UpdateRoundedIcon fontSize="small" color="action" />

                  <Typography sx={{ fontWeight: 600 }}>
                    {user.updated_at ? formatDate(user.updated_at) : 'Never'}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </WhiteCard>
      </Grid>

      {/* Personal information and password */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack component="div" sx={{ gap: 3 }}>
          {/* Edit profile */}
          <WhiteCard padding={3}>
            <Stack component="div" sx={{ gap: 3 }}>
              <Stack
                component="div"
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <PersonRoundedIcon color="primary" />

                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Personal information
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Update your first and last name.
              </Typography>

              {profileSuccess && (
                <Alert severity="success">
                  Your profile has been updated successfully.
                </Alert>
              )}

              <Stack
                component="form"
                sx={{ gap: 2 }}
                onSubmit={handleProfileSubmit}
                noValidate
              >
                <TextInput
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="First name"
                  name="first_name"
                  error={Boolean(profileErrors.first_name)}
                  errorText={profileErrors.first_name}
                  disabled={updateProfile.isPending}
                />

                <TextInput
                  value={lastName}
                  onChange={setLastName}
                  placeholder="Last name"
                  name="last_name"
                  error={Boolean(profileErrors.last_name)}
                  errorText={profileErrors.last_name}
                  disabled={updateProfile.isPending}
                />

                <AppButton
                  type="submit"
                  fullWidth
                  label="Save changes"
                  loading={updateProfile.isPending}
                />
              </Stack>
            </Stack>
          </WhiteCard>

          {/* Change password */}
          <WhiteCard padding={3}>
            <Stack component="div" sx={{ gap: 3 }}>
              <Stack
                component="div"
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <LockRoundedIcon color="primary" />

                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Change password
                </Typography>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Choose a strong password to keep your account secure.
              </Typography>

              {passwordSuccess && (
                <Alert severity="success">
                  Your password has been changed successfully.
                </Alert>
              )}

              <Stack
                component="form"
                sx={{ gap: 2 }}
                onSubmit={handlePasswordSubmit}
                noValidate
              >
                <TextInput
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Current password"
                  name="current_password"
                  password
                  icon={<LockRoundedIcon fontSize="small" />}
                  error={Boolean(passwordErrors.current_password)}
                  errorText={passwordErrors.current_password}
                  disabled={changePassword.isPending}
                />

                <TextInput
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="New password"
                  name="new_password"
                  password
                  icon={<LockRoundedIcon fontSize="small" />}
                  error={Boolean(passwordErrors.new_password)}
                  errorText={passwordErrors.new_password}
                  disabled={changePassword.isPending}
                />

                <TextInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Confirm new password"
                  name="confirm_password"
                  password
                  icon={<LockRoundedIcon fontSize="small" />}
                  error={Boolean(passwordErrors.confirm_password)}
                  errorText={passwordErrors.confirm_password}
                  disabled={changePassword.isPending}
                />

                <AppButton
                  type="submit"
                  fullWidth
                  label="Change password"
                  loading={changePassword.isPending}
                />
              </Stack>
            </Stack>
          </WhiteCard>
          <BankAccountsCard />
        </Stack>
      </Grid>
    </Grid>
  )
}
