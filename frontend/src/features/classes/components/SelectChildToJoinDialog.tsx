import { useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import AppAvatar from '@/components/AppAvatar'

import type { Child } from '@/features/children/api'

interface SelectChildToJoinDialogProps {
  open: boolean
  availableChildren: Child[]
  onClose: () => void
  onConfirm: (child: Child) => void
}

export default function SelectChildToJoinDialog({
  open,
  availableChildren,
  onClose,
  onConfirm,
}: SelectChildToJoinDialogProps) {
  const [selectedChildId, setSelectedChildId] = useState('')

  const handleClose = () => {
    setSelectedChildId('')
    onClose()
  }

  const handleConfirm = () => {
    const child = availableChildren.find((item) => item.id === selectedChildId,)

    if (!child) return

    onConfirm(child)
    setSelectedChildId('')
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>Select a child</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Select the child you want to join a class with.
          </Typography>

          <RadioGroup
            value={selectedChildId}
            onChange={(event) => setSelectedChildId(event.target.value)}
          >
            {availableChildren.map((child) => {
              const fullName = `${child.first_name} ${child.last_name}`

              return (
                <FormControlLabel
                  key={child.id}
                  value={child.id}
                  control={<Radio />}
                  label={
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: 'center' }}
                    >
                      <AppAvatar name={fullName} src={child.avatar_url} />

                      <Typography
                        sx={{
                          fontWeight: 500,
                          lineHeight: 1.4,
                        }}
                      >
                        {fullName}
                      </Typography>
                    </Stack>
                  }
                  sx={{
                    mx: 0,
                    py: 1,
                    width: '100%',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                />
              )
            })}
          </RadioGroup>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <AppButtonOutlined label="Cancel" onClick={handleClose} />

        <AppButton
          label="Continue"
          onClick={handleConfirm}
          disabled={!selectedChildId}
        />
      </DialogActions>
    </Dialog>
  )
}
