import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import type { ReactNode } from 'react'

interface PrimaryCardProps {
  children: ReactNode
  padding?: number
  sx?: SxProps<Theme>
}

export default function PrimaryCard({
  children,
  padding = 3,
  sx = [],
}: PrimaryCardProps) {
  return (
    <Box
      sx={[
        {
          background: (theme) =>
            `linear-gradient(180deg, ${theme.palette.primary.dark} 67%, ${theme.palette.primary.main} 100%)`,
          color: 'primary.contrastText',
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
