import { useHealth } from '@/features/system/api'

export function DashboardPage() {
  const health = useHealth()

  return (
    <section>
      <h1>Dashboard</h1>
      {health.isPending && <p>Checking API…</p>}
      {health.isError && <p>API unreachable: {health.error.message}</p>}
      {health.isSuccess && <p>API status: {health.data.status}</p>}
    </section>
  )
}
