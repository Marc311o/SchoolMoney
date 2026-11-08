import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'

/** My SchoolMoney wallet. The IBAN is fictional: it exists only in SchoolMoney. */
export type Wallet = {
  id: string
  iban: string
  account_type: 'USER'
  user_id: string
  fundraiser_id: null
  balance: string
  created_at: string
}

/** A real bank account, where money can be sent out */
export type BankAccount = {
  id: string
  user_id: string
  iban: string
  account_name: string | null
  created_at: string
}

export type TopUpRequest = {
  /** "0.01" to "10000.00", at most two decimals */
  amount: string
  description?: string
}

export type BankAccountCreate = {
  /** Spaces and lower case are fine, the API cleans them up */
  iban: string
  account_name?: string | null
}

export type TransferOutRequest = {
  external_account_id: string
  amount: string
  description?: string
}

export type Transaction = {
  id: string
  from_account_id: string | null
  to_account_id: string | null
  type: string
  amount: string
  created_by: string
  created_at: string
  description: string | null
}

export type PaginatedTransactions = {
  items: Transaction[]
  total: number
  page: number
  page_size: number
  pages: number
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const walletKeys = {
  all: ['wallet'] as const,
  wallet: () => [...walletKeys.all, 'me'] as const,
  bankAccounts: () => [...walletKeys.all, 'bank-accounts'] as const,
  transactions: () => [...walletKeys.all, 'transactions'] as const,
  transactionPage: (page: number, pageSize: number) =>
    [...walletKeys.transactions(), page, pageSize] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useWallet() {
  return useQuery({
    queryKey: walletKeys.wallet(),
    queryFn: () => api.get<Wallet>('/accounts/me'),
  })
}

export function useBankAccounts() {
  return useQuery({
    queryKey: walletKeys.bankAccounts(),
    queryFn: () => api.get<BankAccount[]>('/accounts/me/external-accounts'),
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** The API answers with the wallet, so the new balance goes straight into the cache */
export function useTopUp() {
  const queryClient = useQueryClient()

  return useMutation<Wallet, ApiError, TopUpRequest>({
    mutationFn: (data) => api.post<Wallet>('/accounts/me/top-up', data),
    onSuccess: (wallet) => {
      queryClient.setQueryData(walletKeys.wallet(), wallet)

      void queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(),
      })
    },
  })
}

/**
 * Money leaves SchoolMoney to one of external bank accounts.
 * 409 = not enough money (see `isNotEnoughMoney`), 404 = the bank account is gone.
 */
export function useTransferOut() {
  const queryClient = useQueryClient()

  return useMutation<Wallet, ApiError, TransferOutRequest>({
    mutationFn: (data) =>
      api.post<Wallet>('/accounts/me/external-transfers', data),
    onSuccess: (wallet) => {
      queryClient.setQueryData(walletKeys.wallet(), wallet)

      void queryClient.invalidateQueries({
        queryKey: walletKeys.transactions(),
      })
    },
  })
}

/**
 * 409 = this account is already added.
 * 422 with a text `detail` = a SchoolMoney wallet number was given;
 * 422 with a list = the IBAN is malformed (use `getFieldErrors`)
 */
export function useAddBankAccount() {
  const queryClient = useQueryClient()

  return useMutation<BankAccount, ApiError, BankAccountCreate>({
    mutationFn: (data) =>
      api.post<BankAccount>('/accounts/me/external-accounts', data),
    onSuccess: (account) => {
      queryClient.setQueryData<BankAccount[]>(
        walletKeys.bankAccounts(),
        (accounts) => (accounts ? [...accounts, account] : [account]),
      )
    },
  })
}

export function useTransactions(page: number, pageSize = 20) {
  return useQuery({
    queryKey: walletKeys.transactionPage(page, pageSize),
    queryFn: () =>
      api.get<PaginatedTransactions>(
        `/accounts/me/transactions?page=${page}&page_size=${pageSize}`,
      ),
  })
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isNotEnoughMoney(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

/** Errors whose `detail` is a plain sentence to show the user (not a field list) */
export function plainErrorMessage(error: unknown): string | null {
  return error instanceof ApiError && typeof error.detail === 'string'
    ? error.detail
    : null
}
