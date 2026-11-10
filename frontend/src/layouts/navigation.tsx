import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded'
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded'
import ChatRoundedIcon from '@mui/icons-material/ChatRounded'
import ChildCareRoundedIcon from '@mui/icons-material/ChildCareRounded'
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded'
import HomeRoundedIcon from '@mui/icons-material/HomeRounded'
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'

import type { SidebarItem } from '@/components/Sidebar'
import type { User } from '@/features/auth/api'

export const PARENT_NAV: SidebarItem[] = [
  { label: 'Dashboard', path: '/', icon: <HomeRoundedIcon /> },
  { label: 'My children', path: '/children', icon: <ChildCareRoundedIcon /> },
  { label: 'Classes', path: '/classes', icon: <GroupsRoundedIcon /> },
  {
    label: 'Wallet',
    path: '/account',
    icon: <AccountBalanceWalletRoundedIcon />,
  },
  { label: 'Chat', path: '/chat', icon: <ChatRoundedIcon /> },
  { label: 'Report', path: '/reports', icon: <AssessmentRoundedIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsRoundedIcon /> },
]

export const ADMIN_NAV: SidebarItem[] = [
  { label: 'Users', path: '/admin/users', icon: <ManageAccountsRoundedIcon /> },
  {
    label: 'Fundraisers',
    path: '/admin/fundraisers',
    icon: <CampaignRoundedIcon />,
  },
  { label: 'Messages', path: '/admin/messages', icon: <ChatRoundedIcon /> },
]

/** Where a signed-in user lands: administrators have their own area */
export function homePath(user: Pick<User, 'role'>): string {
  return user.role === 'ADMIN' ? '/admin/users' : '/'
}
