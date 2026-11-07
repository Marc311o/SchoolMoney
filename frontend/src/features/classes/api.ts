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
  school_year_start: string | null
  treasurer_id: string
  created_at: string
  my_role: ClassRole
  treasurer: UserSummary
}

export type SchoolClassCreate = {
  name: string
  school_name?: string | null
  school_year?: string | null
}

export type ParentSearchResult = {
  id: string
  email: string
  first_name: string
  last_name: string
  avatar_url: string | null
}

export type ClassInviteCreate = {
  parent_id: string
}

export type ClassInviteSent = {
  message: string
  class_id: string
  parent_id: string
  email: string
  sent_at: string
}
/** PATCH /classes/{id}/members/{membership_id}: approve or reject a PENDING child */
export type MembershipReviewStatus = 'ACTIVE' | 'REJECTED'

/** A membership without the nested child, as returned by the review endpoint */
export type ChildClassMembership = Omit<ClassMember, 'child'>

/** GET / POST /classes/{id}/access-code (treasurer only) */
export type ClassAccessCode = {
  id: string
  class_id: string
  code: string
  /** null = never expires */
  valid_until: string | null
  active: boolean
  created_at: string
}

export type ClassAccessCodeCreate = {
  /** ISO date-time with a time zone, in the future. Omit for a code that never expires. */
  valid_until?: string | null
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
  accessCode: (id: string) => [...classesKeys.all, 'access-code', id] as const,
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

/**
 * The class's current access code, or null when it has none (or it expired).
 * Treasurer only: pass `enabled: false` for parents, the API answers them 404.
 */
export function useClassAccessCode(
  classId: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery<ClassAccessCode | null, ApiError>({
    queryKey: classesKeys.accessCode(classId),
    queryFn: () =>
      api.get<ClassAccessCode | null>(`/classes/${classId}/access-code`),
    enabled,
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

/** Creates a new code and switches the old one off: parents must use the new one */
export function useRegenerateAccessCode(classId: string) {
  const queryClient = useQueryClient()

  return useMutation<ClassAccessCode, ApiError, ClassAccessCodeCreate | void>({
    mutationFn: (payload) =>
      api.post<ClassAccessCode>(
        `/classes/${classId}/access-code`,
        payload ?? {},
      ),
    onSuccess: (accessCode) => {
      queryClient.setQueryData(classesKeys.accessCode(classId), accessCode)
    },
  })
}

/**
 * Treasurer approves (ACTIVE) or rejects (REJECTED) a PENDING join request.
 * 409 = the request was already reviewed (e.g. in another tab): the lists refresh anyway.
 */
export function useReviewMembership(classId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    ChildClassMembership,
    ApiError,
    { membershipId: string; status: MembershipReviewStatus }
  >({
    mutationFn: ({ membershipId, status }) =>
      api.patch<ChildClassMembership>(
        `/classes/${classId}/members/${membershipId}`,
        { status },
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: classesKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['children'] }),
      ]),
  })
}
/**
 * Takes a child out of the class (status LEFT). The treasurer can remove anyone,
 * a parent only their own child. Payments and history stay.
 * 409 = the request was rejected earlier, there is nothing to remove.
 */
export function useRemoveMembership(classId: string) {
  const queryClient = useQueryClient()

  return useMutation<ChildClassMembership, ApiError, string>({
    mutationFn: (membershipId) =>
      api.post<ChildClassMembership>(
        `/classes/${classId}/memberships/${membershipId}/remove`,
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: classesKeys.all })
      // the removed child may be one of mine: its card shows the class
      void queryClient.invalidateQueries({ queryKey: ['children'] })
    },
  })
}

export function useSearchParents(email: string) {
  return useQuery<ParentSearchResult[], ApiError>({
    queryKey: ['users', 'search', email],
    queryFn: () =>
      api.get<ParentSearchResult[]>(
        `/users/search?email=${encodeURIComponent(email)}`,
      ),
    enabled: email.trim().length >= 2,
    retry: false,
  })
}

export function useSendClassInvite(classId: string) {
  return useMutation<ClassInviteSent, ApiError, ClassInviteCreate>({
    mutationFn: (payload) =>
      api.post<ClassInviteSent>(`/classes/${classId}/invites`, payload),
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
