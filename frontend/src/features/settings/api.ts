import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, type ApiError } from '@/lib/api'

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
  role: 'PARENT' | 'ADMIN'
  status: 'ACTIVE' | 'BLOCKED'
  created_at: string
  updated_at: string | null
}

export type UserUpdateRequest = {
  first_name?: string
  last_name?: string
}

export type ChangePasswordRequest = {
  current_password: string
  new_password: string
}

export const currentUserKey = ['users', 'me'] as const

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: () => api.get<User>('/users/me'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation<User, ApiError, UserUpdateRequest>({
    mutationFn: (data) => api.patch<User>('/users/me', data),

    onSuccess: (user) => {
      queryClient.setQueryData(currentUserKey, user)
    },
  })
}

export function useChangePassword() {
  return useMutation<void, ApiError, ChangePasswordRequest>({
    mutationFn: (data) => api.patch<void>('/auth/password', data),
  })
}
