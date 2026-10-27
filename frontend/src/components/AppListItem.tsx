import { Avatar, Box, IconButton, Tooltip, Typography } from '@mui/material'
import type { ReactNode, MouseEvent } from 'react'

export interface AppListItemAction {
  label: string
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'success' | 'warning'
}

interface AppListItemProps {
  title: string
  subtitle?: string
  avatar?: ReactNode
  initial?: string
  avatarColor?: string
  actions?: AppListItemAction[]
  onClick?: () => void
  disabled?: boolean
}

export default function AppListItem({
  title,
  subtitle,
  avatar,
  initial,
  avatarColor = 'primary.main',
  actions = [],
  onClick,
  disabled = false,
}: AppListItemProps) {
  const handleActionClick = (
    event: MouseEvent<HTMLButtonElement>,
    action: AppListItemAction,
  ) => {
    event.stopPropagation()
    action.onClick()
  }

  return (
    <Box
      onClick={disabled ? undefined : onClick}
      sx={{
        bgcolor: 'warning.light',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        width: '100%',
        minWidth: 0,
        p: 1.5,
        boxSizing: 'border-box',
        transition: 'background-color 150ms ease',
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,

        ...(onClick && !disabled
          ? {
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }
          : {}),
      }}
    >
      {(avatar || initial) && (
        <Avatar
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            bgcolor: avatarColor,
            color: 'primary.contrastText',
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {avatar ?? initial?.charAt(0).toUpperCase()}
        </Avatar>
      )}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.25,
        }}
      >
        <Typography
          variant="body1"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            lineHeight: 1.4,
          }}
          noWrap
        >
          {title}
        </Typography>

        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.4,
            }}
            noWrap
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          {actions.map((action) => (
            <Tooltip key={action.label} title={action.label}>
              <span>
                <IconButton
                  aria-label={action.label}
                  size="small"
                  color={action.color ?? 'default'}
                  disabled={action.disabled}
                  onClick={(event) => handleActionClick(event, action)}
                >
                  {action.icon}
                </IconButton>
              </span>
            </Tooltip>
          ))}
        </Box>
      )}
    </Box>
  )
}
