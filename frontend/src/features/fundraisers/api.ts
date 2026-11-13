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

export type TreasurerOperation = {
  id: string
  fundraiser_id: string
  author_id: string
  transaction_id: string
  direction: 'WITHDRAWAL' | 'DEPOSIT'
  amount: string
  description: string | null
  created_at: string
}

export type TreasurerWithdrawalCreate = {
  amount: string
  description?: string | null
}

export type TreasurerDepositCreate = {
  amount: string
  description?: string | null
}

export type FundraiserCloseResult = {
  fundraiser_id: string
  status: 'CLOSED'
  closed_at: string
  refunded_total: string
  refund_transactions: number
}

export type FundraiserChildPaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED'

export type FundraiserChildItem = {
  child: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
  is_current_user_child: boolean
  payment_status: FundraiserChildPaymentStatus
  payment: {
    id: string | null
    is_paid: boolean
    amount: string | null
    payer: {
      id: string
      first_name: string
      last_name: string
    } | null
    paid_at: string | null
  }
  refunded_amount: string
}

export type FundraiserChildrenResponse = {
  fundraiser_id: string
  status: FundraiserStatus
  children: FundraiserChildItem[]
}

export type Invoice = {
  id: string
  fundraiser_id: string
  added_by: string
  title: string
  amount: string | null
  file_url: string
  created_at: string
}

export type InvoiceCreate = {
  title: string
  amount?: string | null
  file_url: string
}

export type InvoiceFileUploadRead = {
  file_url: string
}

export const fundraiserKeys = {
  all: ['fundraisers'] as const,
  list: (classId: string) => [...fundraiserKeys.all, 'list', classId] as const,
  children: (fundraiserId: string) =>
    [...fundraiserKeys.all, 'children', fundraiserId] as const,
  invoices: (fundraiserId: string) =>
    [...fundraiserKeys.all, 'invoices', fundraiserId] as const,
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
      void queryClient.invalidateQueries({
        queryKey: fundraiserKeys.list(fundraiser.class_id),
      })

      void queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'detail', fundraiser.id],
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

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: fundraiserKeys.children(fundraiserId),
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'payments', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: walletKeys.wallet(),
        }),

        queryClient.invalidateQueries({
          queryKey: walletKeys.transactions(),
        }),
      ])
    },
  })
}

export function useRefundFundraiserPayment(fundraiserId: string) {
  const queryClient = useQueryClient()

  return useMutation<FundraiserPayment, ApiError, { paymentId: string }>({
    mutationFn: ({ paymentId }) =>
      api.post<FundraiserPayment>(
        `/fundraisers/${fundraiserId}/payments/${paymentId}/refund`,
      ),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: fundraiserKeys.children(fundraiserId),
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'payments', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: walletKeys.wallet(),
        }),

        queryClient.invalidateQueries({
          queryKey: walletKeys.transactions(),
        }),
      ])
    },
  })
}

export function useCreateTreasurerWithdrawal(fundraiserId: string) {
  const queryClient = useQueryClient()

  return useMutation<TreasurerOperation, ApiError, TreasurerWithdrawalCreate>({
    mutationFn: (payload) =>
      api.post<TreasurerOperation>(
        `/fundraisers/${fundraiserId}/withdrawals`,
        payload,
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'operations', fundraiserId],
      })

      void queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
      })

      void queryClient.invalidateQueries({
        queryKey: walletKeys.wallet(),
      })

      void queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(),
      })
    },
  })
}

export function useCreateTreasurerDeposit(fundraiserId: string) {
  const queryClient = useQueryClient()

  return useMutation<TreasurerOperation, ApiError, TreasurerDepositCreate>({
    mutationFn: (payload) =>
      api.post<TreasurerOperation>(
        `/fundraisers/${fundraiserId}/deposits`,
        payload,
      ),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'operations', fundraiserId],
      })

      void queryClient.invalidateQueries({
        queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
      })

      void queryClient.invalidateQueries({
        queryKey: walletKeys.wallet(),
      })

      void queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(),
      })
    },
  })
}

export function useTreasurerOperations(fundraiserId: string) {
  return useQuery<TreasurerOperation[], ApiError>({
    queryKey: [...fundraiserKeys.all, 'operations', fundraiserId],
    queryFn: () =>
      api.get<TreasurerOperation[]>(`/fundraisers/${fundraiserId}/operations`),
    enabled: !!fundraiserId,
  })
}

export function useCloseFundraiser(fundraiserId: string) {
  const queryClient = useQueryClient()

  return useMutation<FundraiserCloseResult, ApiError>({
    mutationFn: () =>
      api.post<FundraiserCloseResult>(`/fundraisers/${fundraiserId}/close`),

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: fundraiserKeys.children(fundraiserId),
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'detail', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'payments', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: [...fundraiserKeys.all, 'operations', fundraiserId],
        }),

        queryClient.invalidateQueries({
          queryKey: walletKeys.wallet(),
        }),

        queryClient.invalidateQueries({
          queryKey: walletKeys.transactions(),
        }),
      ])
    },
  })
}

export function useFundraiserChildren(fundraiserId: string) {
  return useQuery<FundraiserChildrenResponse, ApiError>({
    queryKey: fundraiserKeys.children(fundraiserId),
    queryFn: () =>
      api.get<FundraiserChildrenResponse>(
        `/fundraisers/${fundraiserId}/children`,
      ),
    enabled: !!fundraiserId,
  })
}

export async function uploadFundraiserInvoiceFile(
  fundraiserId: string,
  file: File,
): Promise<InvoiceFileUploadRead> {
  const formData = new FormData()

  formData.append('file', file)

  return api.post<InvoiceFileUploadRead>(
    `/fundraisers/${fundraiserId}/invoices/upload`,
    formData,
  )
}

export function useCreateFundraiserInvoice(fundraiserId: string) {
  const queryClient = useQueryClient()

  return useMutation<Invoice, ApiError, InvoiceCreate>({
    mutationFn: (payload) =>
      api.post<Invoice>(`/fundraisers/${fundraiserId}/invoices`, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: fundraiserKeys.invoices(fundraiserId),
      })
    },
  })
}

export function useUploadFundraiserInvoiceFile(fundraiserId: string) {
  return useMutation<InvoiceFileUploadRead, ApiError, File>({
    mutationFn: (file) => uploadFundraiserInvoiceFile(fundraiserId, file),
  })
}

export function useFundraiserInvoices(fundraiserId: string) {
  return useQuery<Invoice[], ApiError>({
    queryKey: fundraiserKeys.invoices(fundraiserId),
    queryFn: () => api.get<Invoice[]>(`/fundraisers/${fundraiserId}/invoices`),
    enabled: !!fundraiserId,
  })
}
