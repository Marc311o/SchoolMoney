import { Box, Stack, Typography } from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import AppButtonOutlined from '@/components/AppButtonOutlined.tsx'
import AppButton from '@/components/AppButton.tsx'
import AppButtonError from '@/components/AppButtonError.tsx'

interface FundraiserTreasurerActionsProps {
  onWithdrawToWallet: () => void
  onDepositBack: () => void
  onAddInvoice: () => void
  onCloseAndRefund: () => void
  onEdit: () => void
}

export default function FundraiserTreasurerActions({
  onWithdrawToWallet,
  onDepositBack,
  onAddInvoice,
  onCloseAndRefund,
  onEdit,
}: FundraiserTreasurerActionsProps) {
  const mobileButtonSx = {
    width: '100%',
    minWidth: 0,
    '& > button': {
      width: '100%',
      minWidth: 0,
    },
  }

  return (
    <WhiteCard
      sx={{
        bgcolor: 'warning.light',
        border: 1,
        borderColor: 'warning.main',
        containerType: 'inline-size',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: 2,
          p: 1,

          '@container (max-width: 760px)': {
            gridTemplateColumns: 'minmax(0, 1fr)',
            justifyItems: 'center',
          },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            minWidth: 0,
            alignItems: 'center',
            flexWrap: 'wrap',

            '@container (max-width: 760px)': {
              width: '100%',
              maxWidth: 320,
              flexDirection: 'column',
              alignItems: 'stretch',
            },
          }}
        >
          <Typography
            component="span"
            sx={{
              bgcolor: 'warning.light',
              color: 'warning.dark',
              px: 1.25,
              py: 0.25,
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              flexShrink: 0,

              '@container (max-width: 760px)': {
                alignSelf: 'center',
                mb: 0.5,
              },
            }}
          >
            TREASURER
          </Typography>

          <Box sx={{ '@container (max-width: 760px)': mobileButtonSx }}>
            <AppButton
              label="Withdraw to wallet"
              onClick={onWithdrawToWallet}
            />
          </Box>

          <Box sx={{ '@container (max-width: 760px)': mobileButtonSx }}>
            <AppButtonOutlined label="Deposit back" onClick={onDepositBack} />
          </Box>

          <Box sx={{ '@container (max-width: 760px)': mobileButtonSx }}>
            <AppButtonOutlined label="Add invoice" onClick={onAddInvoice} />
          </Box>

          <Box sx={{ '@container (max-width: 760px)': mobileButtonSx }}>
            <AppButtonOutlined label="Edit" onClick={onEdit} />
          </Box>

          <Box
            sx={{
              display: 'none',
              '@container (max-width: 760px)': {
                display: 'block',
                ...mobileButtonSx,
              },
            }}
          >
            <AppButtonError label="Close & refund" onClick={onCloseAndRefund} />
          </Box>
        </Stack>

        <Box
          sx={{
            '@container (max-width: 760px)': {
              display: 'none',
            },
          }}
        >
          <AppButtonError label="Close & refund" onClick={onCloseAndRefund} />
        </Box>
      </Box>
    </WhiteCard>
  )
}
