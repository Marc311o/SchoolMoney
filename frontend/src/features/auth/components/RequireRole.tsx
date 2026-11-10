import { Navigate, Outlet } from 'react-router'

import { type User, useCurrentUser } from '@/features/auth/api'
import { homePath } from '@/layouts/navigation'

interface RequireRoleProps {
  allow: User['role']
}
export function RequireRole({ allow }: RequireRoleProps) {
  const { data: user } = useCurrentUser()

  if (!user) return null
  if (user.role !== allow) return <Navigate to={homePath(user)} replace />

  return <Outlet />
}
