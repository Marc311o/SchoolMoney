import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { api, ApiError } from '@/lib/api'
import { tokenStorage } from '@/lib/tokens'
import type { TokenPair } from '@/lib/tokens'

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

export type LoginRequest = { email: string; password: string }

export type RegisterRequest = LoginRequest & {
  first_name: string
  last_name: string
}

export const currentUserKey = ['auth', 'me'] as const

export function useCurrentUser() {
  return useQuery({
    queryKey: currentUserKey,
    queryFn: () => api.get<User>('/auth/me'),
    enabled: tokenStorage.getAccess() !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation<TokenPair, ApiError, LoginRequest>({
    mutationFn: (data) => api.post<TokenPair>('/auth/login', data),
    onSuccess: (tokens) => {
      tokenStorage.set(tokens)
      queryClient.removeQueries({ queryKey: currentUserKey })
    },
  })
}

/** Registers and signs the new user in straight away */
export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation<TokenPair, ApiError, RegisterRequest>({
    mutationFn: async (data) => {
      await api.post<User>('/auth/register', data)
      return api.post<TokenPair>('/auth/login', {
        email: data.email,
        password: data.password,
      })
    },
    onSuccess: (tokens) => {
      tokenStorage.set(tokens)
      queryClient.removeQueries({ queryKey: currentUserKey })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return () => {
    tokenStorage.clear()
    queryClient.clear()
    navigate('/login', { replace: true })
  }
}
