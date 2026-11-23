import { CircularProgress } from '@mui/material'
import { Navigate, Outlet } from 'react-router'

import { useCurrentUser } from '@/features/auth/api'
import { homePath } from '@/layouts/navigation'
import { tokenStorage } from '@/lib/tokens'

export function GuestOnly() {
  const currentUser = useCurrentUser()

  if (!tokenStorage.getAccess()) return <Outlet />
  if (currentUser.isPending) return <CircularProgress />

  if (currentUser.isSuccess) {
    return <Navigate to={homePath(currentUser.data)} replace />
  }

  return <Outlet />
}
