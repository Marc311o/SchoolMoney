import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'

import AppButton from '@/components/AppButton'
import { onSessionExpired } from '@/lib/tokens'

export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => onSessionExpired(() => setOpen(true)), [])

  function handleSignIn() {
    setOpen(false)
    queryClient.clear()
    navigate('/login', { replace: true, state: { from: location.pathname } })
  }

  return (
    <Dialog
      open={open}
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-text"
    >
      <DialogTitle id="session-expired-title">Session expired</DialogTitle>
      <DialogContent>
        <DialogContentText id="session-expired-text">
          For your security you have been signed out. Sign in again to continue
          where you left off.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <AppButton label="Sign in again" onClick={handleSignIn} />
      </DialogActions>
    </Dialog>
  )
}
