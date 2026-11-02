import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'

import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import ChildCareRoundedIcon from '@mui/icons-material/ChildCareRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import ChatRoundedIcon from '@mui/icons-material/ChatRounded'
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import * as React from 'react'

export interface SidebarItem {
  label: string
  path: string
}

interface SidebarUser {
  firstName: string
  lastName: string
}

interface SidebarProps {
  items?: SidebarItem[]
  activePath: string
  user: SidebarUser
  onNavigate: (path: string) => void
  onLogout?: () => void
  title?: string
}

const SIDEBAR_WIDTH = 260
const SIDEBAR_COMPACT_WIDTH = 76

const defaultItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/' },
  { label: 'My children', path: '/children' },
  { label: 'Classes', path: '/classes' },
  { label: 'Wallet', path: '/account' },
  { label: 'Chat', path: '/chat' },
  { label: 'Report', path: '/reports' },
  { label: 'Settings', path: '/settings' },
]

const itemIcons: Record<string, React.ReactNode> = {
  '/': <HomeRoundedIcon />,
  '/children': <ChildCareRoundedIcon />,
  '/classes': <GroupsRoundedIcon />,
  '/account': <AccountBalanceWalletRoundedIcon />,
  '/chat': <ChatRoundedIcon />,
  '/reports': <AssessmentRoundedIcon />,
  '/settings': <SettingsRoundedIcon />,
}

export default function Sidebar({
  items = defaultItems,
  activePath,
  user,
  onNavigate,
  onLogout,
  title = 'SchoolMoney',
}: SidebarProps) {
  const theme = useTheme()
  const isCompact = useMediaQuery(theme.breakpoints.down('lg'))

  const sidebarWidth = isCompact ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_WIDTH

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarWidth,
        flexShrink: 0,
        transition: 'width 200ms ease',

        '& .MuiDrawer-paper': {
          width: sidebarWidth,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          border: 0,
          background: (muiTheme) =>
            `linear-gradient(180deg, ${muiTheme.palette.primary.dark} 67%, ${muiTheme.palette.primary.main} 100%)`,
          color: 'primary.contrastText',
          p: isCompact ? 1 : 2,
          overflowX: 'hidden',
          transition: 'width 200ms ease',
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: isCompact ? 0 : 1.5,
          py: 2,
          mb: 2,
          textAlign: isCompact ? 'center' : 'left',
        }}
      >
        {isCompact ? (
          <Tooltip title={title} placement="right">
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: 'primary.contrastText',
                cursor: 'default',
              }}
            >
              S
            </Typography>
          </Tooltip>
        ) : (
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: 'primary.contrastText',
              letterSpacing: '-0.5px',
            }}
          >
            {title}
          </Typography>
        )}
      </Box>

      {/* NAV */}
      <List
        disablePadding
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.75,
          flexGrow: 0,
          flexShrink: 0,
          alignSelf: 'stretch',
        }}
      >
        {items.map((item) => {
          const isActive =
            activePath === item.path ||
            (item.path !== '/' && activePath.startsWith(`${item.path}/`))

          return (
            <Tooltip
              key={item.path}
              title={isCompact ? item.label : ''}
              placement="right"
              arrow
            >
              <ListItemButton
                selected={isActive}
                onClick={() => onNavigate(item.path)}
                aria-label={item.label}
                sx={{
                  minHeight: 48,
                  px: isCompact ? 0 : 1.5,
                  justifyContent: isCompact ? 'center' : 'initial',
                  borderRadius: 1,
                  color: 'primary.contrastText',
                  transition: 'background-color 150ms ease',

                  '& .MuiListItemText-primary': {
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: '0.1px',
                  },

                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  },

                  '&.Mui-selected:hover': {
                    bgcolor: 'primary.light',
                  },

                  '&:hover': {
                    bgcolor: 'primary.light',
                  },
                }}
              >
                {isCompact ? (
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      justifyContent: 'center',
                      color: 'inherit',
                    }}
                  >
                    {itemIcons[item.path] || <HomeRoundedIcon />}
                  </ListItemIcon>
                ) : (
                  <ListItemText primary={item.label} />
                )}
              </ListItemButton>
            </Tooltip>
          )
        })}
      </List>

      {/* USER, LOGOUT */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Divider
          sx={{
            mb: 2,
            borderColor: 'divider',
          }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCompact ? 'center' : 'initial',
            gap: 1,
            px: isCompact ? 0 : 1,
          }}
        >
          {!isCompact && (
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: 500,
                color: 'primary.contrastText',
              }}
              noWrap
            >
              {user.firstName} {user.lastName}
            </Typography>
          )}

          <Tooltip title="Logout">
            <IconButton
              onClick={onLogout}
              aria-label="Logout"
              size="small"
              sx={{
                flexShrink: 0,
                color: 'primary.contrastText',
                borderRadius: 1,

                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  )
}

export { SIDEBAR_WIDTH }
