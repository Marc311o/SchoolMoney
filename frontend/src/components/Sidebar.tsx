import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material'

import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'

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

const defaultItems: SidebarItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'My children', path: '/my-children' },
  { label: 'Classes', path: '/classes' },
  { label: 'Wallet', path: '/wallet' },
  { label: 'Chat', path: '/chat' },
  { label: 'Report', path: '/report' },
  { label: 'Settings', path: '/settings' },
]

export default function Sidebar({
  items = defaultItems,
  activePath,
  user,
  onNavigate,
  onLogout,
  title = 'SchoolMoney',
}: SidebarProps) {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,

        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          border: 0,
          background: (theme) =>
            `linear-gradient(180deg, ${theme.palette.primary.dark} 67%, ${theme.palette.primary.main} 100%)`,
          color: 'primary.contrastText',
          p: 2,
        },
      }}
    >
      {/* HEADER */}
      <Box sx={{ px: 1.5, py: 2, mb: 2 }}>
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
          const isActive = activePath === item.path

          return (
            <ListItemButton
              key={item.path}
              selected={isActive}
              onClick={() => onNavigate(item.path)}
              sx={{
                minHeight: 48,
                px: 1.5,
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
              <ListItemText primary={item.label} />
            </ListItemButton>
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
            gap: 1,
            px: 1,
          }}
        >
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
