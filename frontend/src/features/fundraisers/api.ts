import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'

export type FundraiserStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export type FundraiserCreate = {
  class_id: string
  name: string
  description?: string | null
  logo_url?: string | null
  required_amount_per_child: string
  start_date: string
  end_date: string
}

export type FundraiserUpdate = {
  name?: string
  description?: string | null
  logo_url?: string | null
  required_amount_per_child?: string
  start_date?: string
  end_date?: string
}

export type Fundraiser = {
  id: string
  class_id: string
  author_id: string
  name: string
  description: string | null
  logo_url: string | null
  required_amount_per_child: string
  start_date: string
  end_date: string
  status: FundraiserStatus
  is_blocked: boolean
  created_at: string
  closed_at: string | null
  iban: string | null
}

export const fundraiserKeys = {
  all: ['fundraisers'] as const,
  list: (classId: string) => [...fundraiserKeys.all, 'list', classId] as const,
}

export function useFundraisers(classId: string) {
  return useQuery<Fundraiser[], ApiError>({
    queryKey: fundraiserKeys.list(classId),
    queryFn: () =>
      api.get<Fundraiser[]>(
        `/fundraisers?class_id=${encodeURIComponent(classId)}`,
      ),
    enabled: !!classId,
  })
}

export function useCreateFundraiser() {
  const queryClient = useQueryClient()

  return useMutation<Fundraiser, ApiError, FundraiserCreate>({
    mutationFn: (payload) => api.post<Fundraiser>('/fundraisers', payload),

    onSuccess: (fundraiser) => {
      queryClient.invalidateQueries({
        queryKey: fundraiserKeys.list(fundraiser.class_id),
      })
    },
  })
}

export function useUpdateFundraiser() {
  const queryClient = useQueryClient()

  return useMutation<
    Fundraiser,
    ApiError,
    { fundraiserId: string; payload: FundraiserUpdate }
  >({
    mutationFn: ({ fundraiserId, payload }) =>
      api.patch<Fundraiser>(`/fundraisers/${fundraiserId}`, payload),

    onSuccess: (fundraiser) => {
      queryClient.invalidateQueries({
        queryKey: fundraiserKeys.list(fundraiser.class_id),
      })
    },
  })
}
