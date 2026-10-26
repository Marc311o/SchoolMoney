import { useHealth } from '@/features/system/api'
import { Box, Button, Chip, Typography } from '@mui/material'
import TextInput from '@/components/TextInput.tsx'
import { useState } from 'react'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import UserStatusChip from '@/components/UserStatusChip.tsx'
import AppButton from '@/components/AppButton.tsx'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'
import WhiteCard from '@/components/WhiteCard.tsx'
import PrimaryCard from '@/components/PrimaryCard.tsx'
import AppListItem from '@/components/AppListItem.tsx'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import SelectChips from '@/components/SelectChips'

export function DashboardPage() {
  const health = useHealth()

  // for text fields
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  // for select chips
  const [selectedRole, setSelectedRole] = useState<string | null>('parent')

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: 3,
          bgcolor: 'background.default',
        }}
      >
        <section>
          <h1>Dashboard</h1>
          {health.isPending && <p>Checking API…</p>}
          {health.isError && <p>API unreachable: {health.error.message}</p>}
          {health.isSuccess && <p>API status: {health.data.status}</p>}

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              maxWidth: 320,
              mb: 3,
            }}
          >
            <UserStatusChip label="Treasurer" />
            <UserStatusChip label="Administrator" />
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              maxWidth: 320,
              mb: 3,
            }}
          >
            <AppButton label="Save changes" />
            <AppButton label="Saving..." loading />
            <AppButton label="Submit" type="submit" fullWidth />

            <AppButtonOutlined label="Save changes" />
            <AppButtonOutlined label="Saving..." loading />
            <AppButtonOutlined label="Submit" type="submit" fullWidth />
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              width: '100%',
              alignItems: 'stretch',
              mb: 3,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <PrimaryCard>
                <h2>Welcome!</h2>
                <p>Your dashboard overview</p>
                <AppButtonOutlined label="Get started" />
              </PrimaryCard>
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <WhiteCard>
                <h2>User details</h2>
                <TextInput
                  value={username}
                  onChange={setUsername}
                  placeholder="Username"
                />
                <AppButton label="Cancel" />
              </WhiteCard>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              maxWidth: 320,
              mb: 3,
            }}
          >
            <TextInput
              name="username"
              value={username}
              onChange={setUsername}
              placeholder="Username"
              icon={<PersonRoundedIcon fontSize="small" />}
              error={!username.trim()}
              errorText={!username.trim() ? 'Username is required' : undefined}
            />

            <TextInput
              name="password"
              value={password}
              onChange={setPassword}
              placeholder="Password"
              icon={<LockRoundedIcon fontSize="small" />}
              password
              error={password.length > 0 && password.length < 8}
              errorText={
                password.length > 0 && password.length < 8
                  ? 'Password must be at least 8 characters'
                  : undefined
              }
            />
          </Box>

          <Button variant="contained">Theme test (button)</Button>

          <Button
            variant="contained"
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.main',
              },
            }}
          >
            Theme test (button light)
          </Button>

          <Chip
            label="Theme test (chip success)"
            color="success"
            variant="outlined"
          />
          <Chip
            label="Theme test (chip error)"
            color="error"
            variant="outlined"
          />

          {/* APP LIST ITEMS */}
          <Box sx={{ width: '50%' }}>
            <WhiteCard>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                  AppListItems
                </Typography>

                <AppListItem
                  title="Anna Kowalska"
                  subtitle="Klasa 3A · Saldo: 125,00 zł"
                  initial="Anna"
                  avatarColor="primary.main"
                  actions={[
                    {
                      label: 'Edytuj',
                      icon: <EditRoundedIcon />,
                      onClick: () => {},
                      color: 'primary',
                    },
                    {
                      label: 'Usuń',
                      icon: <DeleteOutlineRoundedIcon />,
                      onClick: () => {},
                      color: 'error',
                    },
                  ]}
                />

                <AppListItem
                  title="Teatr - zbiórka"
                  subtitle="Klasa 3B"
                  actions={[
                    {
                      label: 'Blokuj',
                      icon: <BlockRoundedIcon />,
                      onClick: () => {},
                      color: 'error',
                    },
                  ]}
                />

                <AppListItem title="Kawiarnia" subtitle="Klasa 3F" />
              </Box>
            </WhiteCard>
          </Box>

          <Box sx={{ width: '35%' }}>
            <WhiteCard>
              <SelectChips
                options={[
                  { label: 'Parent', value: 'parent' },
                  { label: 'Treasurer', value: 'treasurer' },
                  { label: 'Administrator', value: 'admin' },
                ]}
                value={selectedRole}
                onChange={setSelectedRole}
              />
            </WhiteCard>
          </Box>
        </section>
      </Box>
    </Box>
  )
}
