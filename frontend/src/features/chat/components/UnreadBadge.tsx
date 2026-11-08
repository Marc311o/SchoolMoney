import { Box } from '@mui/material'

interface UnreadBadgeProps {
  count: number
}

/** Green pill with the number of unread messages; nothing when there are none */
export function UnreadBadge({ count }: UnreadBadgeProps) {
  if (count <= 0) return null

  return (
    <Box
      component="span"
      aria-label={`${count} unread`}
      sx={{
        flex: 'none',
        minWidth: 20,
        height: 20,
        px: 0.75,
        boxSizing: 'border-box',
        borderRadius: 999,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '20px',
        textAlign: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </Box>
  )
}
