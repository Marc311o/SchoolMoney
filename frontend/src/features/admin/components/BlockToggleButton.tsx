import { Button, IconButton, Tooltip } from '@mui/material'
import BlockRoundedIcon from '@mui/icons-material/BlockRounded'
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded'

interface BlockToggleButtonProps {
  blocked: boolean
  name: string
  compact: boolean
  disabled?: boolean
  onBlock: () => void
  onUnblock: () => void
}

export function BlockToggleButton({
  blocked,
  name,
  compact,
  disabled = false,
  onBlock,
  onUnblock,
}: BlockToggleButtonProps) {
  const label = blocked ? 'Unblock' : 'Block'
  const color = blocked ? 'primary.main' : 'error.dark'
  const onClick = blocked ? onUnblock : onBlock

  if (compact) {
    return (
      <Tooltip title={label}>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          aria-label={`${label} ${name}`}
          size="small"
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            color,
          }}
        >
          {blocked ? (
            <LockOpenRoundedIcon fontSize="small" />
          ) : (
            <BlockRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    )
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="outlined"
      size="small"
      aria-label={`${label} ${name}`}
      sx={{
        minHeight: 36,
        borderRadius: 1,
        fontWeight: 600,
        textTransform: 'none',
        whiteSpace: 'nowrap',
        color,
        borderColor: blocked ? 'primary.main' : '#E8B4A2',
      }}
    >
      {label}
    </Button>
  )
}
