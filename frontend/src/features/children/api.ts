import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, ApiError } from '@/lib/api'

export type MembershipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'LEFT'

/** The class the child is in now, or is waiting to join */
export type ChildClass = {
  id: string
  name: string
  status: MembershipStatus
}

export type Child = {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  /** ISO date, e.g. "2018-05-04"  */
  birth_date: string
  avatar_url: string | null
  /** Always false here: removed children are not returned by these endpoints */
  removed: boolean
  school_class: ChildClass | null
  created_at: string
}

export type ChildCreate = {
  first_name: string
  last_name: string
  birth_date: string
  avatar_url?: string | null
}

/** Send only what changed. Names and birth date cannot be null, avatar can. */
export type ChildUpdate = {
  first_name?: string
  last_name?: string
  birth_date?: string
  avatar_url?: string | null
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const childrenKeys = {
  all: ['children'] as const,
  list: () => [...childrenKeys.all, 'list'] as const,
  detail: (id: string) => [...childrenKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useChildren() {
  return useQuery({
    queryKey: childrenKeys.list(),
    queryFn: () => api.get<Child[]>('/children'),
  })
}

export function useChild(id: string) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: childrenKeys.detail(id),
    queryFn: () => api.get<Child>(`/children/${id}`),
    // Show the child from the list straight away while the detail loads
    initialData: () =>
      queryClient
        .getQueryData<Child[]>(childrenKeys.list())
        ?.find((child) => child.id === id),
    initialDataUpdatedAt: () =>
      queryClient.getQueryState(childrenKeys.list())?.dataUpdatedAt,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Adding a removed child again (same name and birth date) brings it back */
export function useCreateChild() {
  const queryClient = useQueryClient()

  return useMutation<Child, ApiError, ChildCreate>({
    mutationFn: (data) => api.post<Child>('/children', data),
    onSuccess: (child) => {
      queryClient.setQueryData(childrenKeys.detail(child.id), child)
      return queryClient.invalidateQueries({ queryKey: childrenKeys.list() })
    },
  })
}

export function useUpdateChild() {
  const queryClient = useQueryClient()

  return useMutation<Child, ApiError, { id: string; data: ChildUpdate }>({
    mutationFn: ({ id, data }) => api.patch<Child>(`/children/${id}`, data),
    onSuccess: (child) => {
      queryClient.setQueryData(childrenKeys.detail(child.id), child)
      queryClient.setQueryData<Child[]>(childrenKeys.list(), (children) =>
        children?.map((item) => (item.id === child.id ? child : item)),
      )
    },
  })
}

/**
 * Fails with 409 while the child has a payment in an open fundraiser.
 * `error.message` then reads "Child has payments in open fundraisers: <names>".
 */
export function useRemoveChild() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete<void>(`/children/${id}`),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Child[]>(childrenKeys.list(), (children) =>
        children?.filter((child) => child.id !== id),
      )
      queryClient.removeQueries({ queryKey: childrenKeys.detail(id) })
    },
  })
}

export function isRemoveBlocked(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409
}
