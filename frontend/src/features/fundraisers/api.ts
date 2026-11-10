import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'
import { walletKeys } from '@/features/wallet/api'

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

export type FundraiserChildProgress = {
  child_id: string
  required_amount_per_child: string
  paid_amount: string
  refunded_amount: string
  remaining_amount: string
  is_paid: boolean
}

export type FundraiserProgress = {
  fundraiser_id: string
  children_count: number
  required_total: string
  paid_total: string
  refunded_total: string
  treasurer_withdrawn_total: string
  treasurer_deposited_total: string
  current_balance: string
}

export type FundraiserDetail = Fundraiser & {
  children: FundraiserChildProgress[]
  progress: FundraiserProgress
}

export type FundraiserPayment = {
  id: string
  fundraiser_id: string
  child_id: string
  payer_id: string
  transaction_id: string
  amount: string
  paid_at: string
  refunded_at: string | null
  refund_transaction_id: string | null
}

export type FundraiserPaymentCreate = {
  child_id: string
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

export function useFundraiser(fundraiserId: string) {
  return useQuery<FundraiserDetail, ApiError>({
    queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
    queryFn: () => api.get<FundraiserDetail>(`/fundraisers/${fundraiserId}`),
    enabled: !!fundraiserId,
  })
}

export function useFundraiserPayments(fundraiserId: string) {
  return useQuery<FundraiserPayment[], ApiError>({
    queryKey: [...fundraiserKeys.all, 'payments', fundraiserId],
    queryFn: () =>
      api.get<FundraiserPayment[]>(`/fundraisers/${fundraiserId}/payments`),
    enabled: !!fundraiserId,
  })
}

export function useCreateFundraiserPayment(fundraiserId: string) {
  const queryClient = useQueryClient()

  return useMutation<FundraiserPayment, ApiError, FundraiserPaymentCreate>({
    mutationFn: (payload) =>
      api.post<FundraiserPayment>(
        `/fundraisers/${fundraiserId}/payments`,
        payload,
      ),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'payments', fundraiserId],
      })

      queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
      })

      queryClient.invalidateQueries({
        queryKey: walletKeys.wallet(),
      })

      queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(),
      })
    },
  })
}
