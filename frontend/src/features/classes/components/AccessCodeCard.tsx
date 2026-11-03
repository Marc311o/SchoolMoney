import { ButtonBase, Stack, Typography } from '@mui/material'
import { useState } from 'react'

import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import type { SnackbarSeverity } from '@/components/AppSnackbar'
import ConfirmDialog from '@/components/ConfirmDialog'
import WhiteCard from '@/components/WhiteCard'
import {
  useClassAccessCode,
  useRegenerateAccessCode,
} from '@/features/classes/api'
import { copyToClipboard } from '@/lib/clipboard'

interface AccessCodeCardProps {
  classId: string
  /** Feedback for the page's snackbar */
  onNotify: (message: string, severity?: SnackbarSeverity) => void
}

/** Treasurer only: render it just for the treasurer, the API answers 404 to others */
export function AccessCodeCard({ classId, onNotify }: AccessCodeCardProps) {
  const { data: accessCode, isPending } = useClassAccessCode(classId)
  const regenerate = useRegenerateAccessCode(classId)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const copy = async (code: string) => {
    if (await copyToClipboard(code)) {
      onNotify('Code copied to clipboard')
    } else {
      onNotify('Could not copy the code', 'error')
    }
  }

  const generate = () => {
    regenerate.mutate(undefined, {
      onSuccess: () => {
        setIsConfirmOpen(false)
        onNotify('New code generated')
      },
      onError: () => {
        if (!isConfirmOpen) onNotify('Could not generate a code', 'error')
      },
    })
  }

  const handleGenerateClick = () => {
    regenerate.reset()
    if (accessCode) setIsConfirmOpen(true)
    else generate()
  }

  return (
    <WhiteCard>
      <Stack spacing={1}>
        <Typography variant="h2">Access code</Typography>

        {accessCode ? (
          <ButtonBase
            onClick={() => copy(accessCode.code)}
            title="Click to copy"
            aria-label={`Copy access code ${accessCode.code}`}
            sx={{
              justifyContent: 'flex-start',
              px: 1,
              mx: -1,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: 28,
              letterSpacing: '0.08em',
              wordBreak: 'break-all',
              textAlign: 'left',
              '&:hover': { bgcolor: 'action.hover' },
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: 'primary.main',
              },
            }}
          >
            {accessCode.code}
          </ButtonBase>
        ) : (
          <Typography sx={{ color: 'text.secondary' }}>
            {isPending ? 'Loading…' : 'No active code'}
          </Typography>
        )}

        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Share it with parents by email or in the class group. Children joined
          with the code still need your approval.
        </Typography>

        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1.5, pt: 1 }}>
          <AppButton
            label="Copy code"
            disabled={!accessCode}
            onClick={() => accessCode && copy(accessCode.code)}
          />
          <AppButtonOutlined
            label={accessCode ? 'Generate new code' : 'Generate code'}
            loading={regenerate.isPending && !isConfirmOpen}
            onClick={handleGenerateClick}
          />
        </Stack>
      </Stack>

      <ConfirmDialog
        open={isConfirmOpen}
        title="Generate a new code?"
        description="The current code stops working right away. Parents who have not joined yet will need the new one."
        confirmLabel="Generate"
        destructive
        loading={regenerate.isPending}
        error={
          regenerate.isError
            ? 'Could not generate a code. Please try again.'
            : null
        }
        onConfirm={generate}
        onClose={() => setIsConfirmOpen(false)}
      />
    </WhiteCard>
  )
}
