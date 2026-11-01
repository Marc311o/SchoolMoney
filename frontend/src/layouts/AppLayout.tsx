import { Outlet, useLocation, useNavigate } from 'react-router'
import Sidebar from '@/components/Sidebar'
import { useLogout, useCurrentUser } from '@/features/auth/api.ts'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()
  const { data: user } = useCurrentUser()
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {' '}
      <Sidebar
        user={{ firstName: user.first_name, lastName: user.last_name }}
        activePath={location.pathname}
        onNavigate={navigate}
        onLogout={logout}
      />
      <main
        style={{
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
