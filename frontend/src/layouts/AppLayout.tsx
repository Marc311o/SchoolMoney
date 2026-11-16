import { Outlet, useLocation, useMatch, useNavigate } from 'react-router'
import { useLogout, useCurrentUser } from '@/features/auth/api.ts'
import Sidebar, { type SidebarItem } from '@/components/Sidebar'
import { totalUnread, useChats, useChatWebSocket } from '@/features/chat/api'

interface AppLayoutProps {
  items: SidebarItem[]
}

export function AppLayout({ items }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useLogout()
  const { data: user } = useCurrentUser()
  const chatMatch = useMatch('/chat/:chatId')
  const activeChatId = chatMatch?.params.chatId

  useChatWebSocket(activeChatId, user?.id ?? '')
  const chats = useChats()
  const unreadChatCount = totalUnread(chats.data)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        items={items}
        user={{
          firstName: user?.first_name ?? '',
          lastName: user?.last_name ?? '',
        }}
        activePath={location.pathname}
        unreadChatCount={unreadChatCount}
        onNavigate={navigate}
        onLogout={logout}
      />
      <main
        style={{
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
