import { useHealth } from '@/features/system/api'
import { Box, Button, Chip } from '@mui/material'
import Sidebar from '@/components/Sidebar'
import TextInput from '@/components/TextInput.tsx'
import { useState } from 'react'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import UserStatusChip from '@/components/UserStatusChip.tsx'

export function DashboardPage() {
  const health = useHealth()

  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        user={{ firstName: 'Jan', lastName: 'Kowalski' }}
        activePath="/dashboard"
        onNavigate={(path) => {
          window.location.href = path
        }}
      />

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
        </section>
      </Box>
    </Box>
  )
}
