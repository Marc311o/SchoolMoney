import { Box } from '@mui/material'
import type { ReactNode } from 'react'

interface WhiteCardProps {
  children: ReactNode
  padding?: number
}

export default function WhiteCard({ children, padding = 3 }: WhiteCardProps) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: padding,
      }}
    >
      {children}
    </Box>
  )
}
