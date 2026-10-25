import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

export type Health = { status: string }

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<Health>('/health'),
  })
}
