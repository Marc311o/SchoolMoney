import { notifySessionExpired, tokenStorage } from '@/lib/tokens'
import type { TokenPair } from '@/lib/tokens'

const BASE_URL = '/api'

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh']

export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(
      typeof detail === 'string'
        ? detail
        : `Request failed with status ${status}`,
    )
    this.status = status
    this.detail = detail
  }
}

function send(path: string, init?: RequestInit): Promise<Response> {
  const token = tokenStorage.getAccess()
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
}

async function refreshTokens(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefresh()
  if (!refreshToken) return false

  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!response.ok) return false

  tokenStorage.set((await response.json()) as TokenPair)
  return true
}

let refreshInFlight: Promise<boolean> | null = null

function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= refreshTokens()
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response = await send(path, init)

  if (
    response.status === 401 &&
    !AUTH_PATHS.includes(path) &&
    tokenStorage.getRefresh()
  ) {
    if (await refreshOnce()) {
      response = await send(path, init)
    } else {
      tokenStorage.clear()
      notifySessionExpired()
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, body?.detail ?? body)
  }

  return response.status === 204 ? (undefined as T) : response.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

type ValidationIssue = { loc: (string | number)[]; msg: string }

/** FastAPI 422 → { field: message }, e.g. { password: "String should have at least 8 characters" } */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (
    !(error instanceof ApiError) ||
    error.status !== 422 ||
    !Array.isArray(error.detail)
  ) {
    return {}
  }

  const errors: Record<string, string> = {}
  for (const issue of error.detail as ValidationIssue[]) {
    const field = issue.loc.at(-1)
    if (typeof field === 'string' && !(field in errors)) {
      errors[field] = issue.msg.replace(/^Value error, /, '')
    }
  }
  return errors
}
