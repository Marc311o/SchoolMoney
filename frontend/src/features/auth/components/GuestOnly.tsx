import { Navigate, Outlet } from 'react-router'

import { tokenStorage } from '@/lib/tokens'

export function GuestOnly() {
  return tokenStorage.getAccess() ? <Navigate to="/" replace /> : <Outlet />
}
