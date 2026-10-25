import { useHealth } from '@/features/system/api'
import { Button, Chip } from '@mui/material'

export function DashboardPage() {
  const health = useHealth()

  return (
    <section>
      <h1>Dashboard</h1>
      {health.isPending && <p>Checking API…</p>}
      {health.isError && <p>API unreachable: {health.error.message}</p>}
      {health.isSuccess && <p>API status: {health.data.status}</p>}

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
      <Chip label="Theme test (chip error)" color="error" variant="outlined" />
    </section>
  )
}
