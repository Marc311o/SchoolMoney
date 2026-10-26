import { Box } from '@mui/material'
import type { ReactNode } from 'react'

interface PrimaryCardProps {
  children: ReactNode
  padding?: number
}

export default function PrimaryCard({
  children,
  padding = 3,
}: PrimaryCardProps) {
  return (
    <Box
      sx={{
        background: (theme) =>
          `linear-gradient(180deg, ${theme.palette.primary.dark} 67%, ${theme.palette.primary.main} 100%)`,
        color: 'primary.contrastText',
        borderRadius: 1,
        p: padding,
      }}
    >
      {children}
    </Box>
  )
}
