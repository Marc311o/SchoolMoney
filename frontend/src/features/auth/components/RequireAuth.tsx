import { Box, CircularProgress } from '@mui/material'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useCurrentUser } from '@/features/auth/api'
import { SessionExpiredDialog } from '@/features/auth/components/SessionExpiredDialog'
import { tokenStorage } from '@/lib/tokens'

export function RequireAuth() {
  const location = useLocation()
  const user = useCurrentUser()
  const toLogin = (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  )

  if (!tokenStorage.getAccess()) return toLogin

  if (user.isPending) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (user.isError) return toLogin

  return (
    <>
      <Outlet />
      <SessionExpiredDialog />
    </>
  )
}
