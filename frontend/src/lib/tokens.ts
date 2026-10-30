const ACCESS_KEY = 'schoolmoney.access_token'
const REFRESH_KEY = 'schoolmoney.refresh_token'

export type TokenPair = { access_token: string; refresh_token: string }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const tokenStorage = {
  getAccess: () => read(ACCESS_KEY),
  getRefresh: () => read(REFRESH_KEY),

  set(tokens: TokenPair) {
    try {
      localStorage.setItem(ACCESS_KEY, tokens.access_token)
      localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
    } catch {
      // Storage unavailable (private mode)
    }
  },

  clear() {
    try {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
    } catch {
      // Nothing to clear
    }
  },
}

type Listener = () => void
const sessionExpiredListeners = new Set<Listener>()

export function onSessionExpired(listener: Listener): () => void {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

export function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener())
}
