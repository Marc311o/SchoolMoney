import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MembershipStatus } from '@/features/children/api'
import { api, ApiError } from '@/lib/api'

export type ClassRole = 'TREASURER' | 'PARENT'

/** No email: only what other parents in the class may see */
export type UserSummary = {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export type ChildSummary = {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  removed: boolean
}

/** A child's membership in a class. `id` is the membership id, not the child's. */
export type ClassMember = {
  id: string
  child_id: string
  class_id: string
  status: MembershipStatus
  requested_at: string
  joined_at: string | null
  left_at: string | null
  child: ChildSummary
}

export type ClassMemberWithParent = ClassMember & {
  parent: UserSummary
}

type SchoolClassBase = {
  id: string
  name: string
  school_name: string | null
  treasurer_id: string
  created_at: string
  my_role: ClassRole
  treasurer: UserSummary
}

export type SchoolClassCreate = {
  name: string
  school_name?: string | null
  school_year?: string | null
  append_school_year: boolean
}

/** GET /classes */
export type ClassListItem = SchoolClassBase & {
  /** My children in this class: ACTIVE or PENDING */
  my_children: ClassMember[]
  /** ACTIVE children in the whole class */
  children_count: number
}

/** GET /classes/{id} */
export type ClassDetail = SchoolClassBase & {
  /** Sorted by last name. PENDING ones come only for the treasurer. */
  children: ClassMemberWithParent[]
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const classesKeys = {
  all: ['classes'] as const,
  list: () => [...classesKeys.all, 'list'] as const,
  detail: (id: string) => [...classesKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useClasses() {
  return useQuery({
    queryKey: classesKeys.list(),
    queryFn: () => api.get<ClassListItem[]>('/classes'),
  })
}

export function useClass(id: string) {
  return useQuery<ClassDetail, ApiError>({
    queryKey: classesKeys.detail(id),
    queryFn: () => api.get<ClassDetail>(`/classes/${id}`),
    // 404 = no such class or no access: asking again will not change that
    retry: (failureCount, error) => !isClassNotFound(error) && failureCount < 1,
  })
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateClass() {
  const queryClient = useQueryClient()

  return useMutation<ClassListItem, ApiError, SchoolClassCreate>({
    mutationFn: (payload) => api.post<ClassListItem>('/classes', payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: classesKeys.list(),
      })
    },
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isClassNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

/** The details page opens for the treasurer and for parents with an ACTIVE child */
export function canOpenClass(item: ClassListItem): boolean {
  return (
    item.my_role === 'TREASURER' ||
    item.my_children.some((member) => member.status === 'ACTIVE')
  )
}

/** Only PENDING children: the class waits for the treasurer's approval */
export function isWaitingForApproval(item: ClassListItem): boolean {
  return !canOpenClass(item)
}
