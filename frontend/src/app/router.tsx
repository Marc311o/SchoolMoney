import { createBrowserRouter } from 'react-router'

import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ChildrenPage } from '@/features/children/pages/ChildrenPage'
import { ClassesPage } from '@/features/classes/pages/ClassesPage'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { WalletPage } from '@/features/wallet/pages/WalletPage'
import { AppLayout } from '@/layouts/AppLayout.tsx'
import { AuthLayout } from '@/layouts/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { GuestOnly } from '@/features/auth/components/GuestOnly.tsx'
import { RequireAuth } from '@/features/auth/components/RequireAuth.tsx'

export const router = createBrowserRouter([
  // Public: not signed in
  {
    element: <AuthLayout />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
    ],
  },

  // Signed in
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/children', element: <ChildrenPage /> },
          { path: '/classes', element: <ClassesPage /> },
          { path: '/account', element: <WalletPage /> },
          { path: '/chat', element: <ChatPage /> },
          { path: '/reports', element: <ReportsPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
