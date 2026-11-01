import { Outlet, useLocation, useNavigate } from 'react-router'
import Sidebar from '@/components/Sidebar'
import { useLogout } from '@/features/auth/api.ts'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {' '}
      <Sidebar
        user={{ firstName: 'Jan', lastName: 'Kowalski' }}
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
