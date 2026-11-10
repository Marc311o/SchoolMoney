import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'

export type AccountStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_ACTIVATION'

/** GET /admin/users: a row of the Users / Treasurers table */
export type AdminUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  status: AccountStatus
  created_at: string
  children: { id: string; first_name: string; last_name: string }[]
  /** classes this user runs as treasurer */
  classes: { id: string; name: string }[]
}

export type Page<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export type UserFilters = {
  q: string
  status: AccountStatus | 'ALL'
  treasurersOnly: boolean
  page: number
  pageSize: number
}

export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  userList: (filters: UserFilters) => [...adminKeys.users(), filters] as const,
}

export function useAdminUsers(filters: UserFilters) {
  return useQuery<Page<AdminUser>, ApiError>({
    queryKey: adminKeys.userList(filters),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(filters.page),
        page_size: String(filters.pageSize),
      })
      if (filters.q.trim()) params.set('q', filters.q.trim())
      if (filters.status !== 'ALL') params.set('status', filters.status)
      if (filters.treasurersOnly) params.set('treasurers', 'true')
      return api.get<Page<AdminUser>>(`/admin/users?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

type StatusChange = { userId: string; status: 'ACTIVE' | 'BLOCKED' }

/** Block or unblock. Every cached page is refreshed: the row may leave a filter. */
export function useSetUserStatus() {
  const queryClient = useQueryClient()

  return useMutation<AdminUser, ApiError, StatusChange>({
    mutationFn: ({ userId, status }) =>
      api.patch<AdminUser>(`/admin/users/${userId}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })
}
