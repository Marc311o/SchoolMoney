import { Box, type SxProps, type Theme } from '@mui/material'
import type { ReactNode } from 'react'

interface WhiteCardProps {
  children: ReactNode
  padding?: number
  sx?: SxProps<Theme>
}

export default function WhiteCard({
  children,
  padding = 3,
  sx,
}: WhiteCardProps) {
  return (
    <Box
      sx={[
        {
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: padding,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}
