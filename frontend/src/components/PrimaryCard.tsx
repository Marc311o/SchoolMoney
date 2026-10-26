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
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 1,
        p: padding,
      }}
    >
      {children}
    </Box>
  )
}
