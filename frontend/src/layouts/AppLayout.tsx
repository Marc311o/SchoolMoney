// import { Outlet } from 'react-router'
//
// export function AppLayout() {
//   return <Outlet />
// }

import { Outlet, useLocation, useNavigate } from 'react-router'
import Sidebar from '@/components/Sidebar'

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {' '}
      <Sidebar
        user={{ firstName: 'Jan', lastName: 'Kowalski' }}
        activePath={location.pathname}
        onNavigate={navigate}
        onLogout={() => navigate('/login')}
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
