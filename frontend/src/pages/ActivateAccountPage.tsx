import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'

function getTokenFromHash(): string | null {
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  return params.get('token')
}

async function activateAccount(token: string) {
  const response = await fetch('/api/auth/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Nie udało się aktywować konta')
  }

  return response.json().catch(() => ({}))
}

export function ActivateAccountPage() {
  const navigate = useNavigate()
  const [token] = useState<string | null>(() => getTokenFromHash())

  const { isLoading, isSuccess, isError, error } = useQuery({
    queryKey: ['activate-account', token],
    queryFn: () => activateAccount(token as string),
    enabled: Boolean(token),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  })

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '2rem',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
        }}
      >
        <h2 style={{ color: '#1E2220', marginBottom: '1rem' }}>
          Aktywacja konta
        </h2>

        {isLoading && (
          <p style={{ color: '#6C726E' }}>Trwa aktywacja konta...</p>
        )}

        {isSuccess && (
          <div>
            <p style={{ color: '#1F6B48', fontWeight: 600 }}>
              Konto zostało pomyślnie aktywowane!
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                marginTop: '1.25rem',
                backgroundColor: '#1E6A4C',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Przejdź do logowania
            </button>
          </div>
        )}

        {(isError || !token) && (
          <div>
            <p style={{ color: '#A83832', fontWeight: 600 }}>
              Aktywacja nie powiodła się
            </p>
            <p style={{ color: '#6C726E', fontSize: '0.95rem' }}>
              {!token
                ? 'Brak tokenu w linku aktywacyjnym.'
                : error?.message || 'Nie udało się aktywować konta'}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                marginTop: '1.25rem',
                backgroundColor: '#6C726E',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Wróć do logowania
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
