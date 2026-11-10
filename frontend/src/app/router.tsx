import { createBrowserRouter, Navigate } from 'react-router'

import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ActivateAccountPage } from '@/pages/ActivateAccountPage'
import { ChildrenPage } from '@/features/children/pages/ChildrenPage'
import { ClassesPage } from '@/features/classes/pages/ClassesPage'
import { ClassPage } from '@/features/classes/pages/ClassPage'
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
import { ADMIN_NAV, PARENT_NAV } from '@/layouts/navigation.tsx'
import { RequireRole } from '@/features/auth/components/RequireRole.tsx'
import { AdminUsersPage } from '@/features/admin/pages/AdminUserPage.tsx'
import { AdminFundraisersPage } from '@/features/admin/pages/AdminFundraisersPage.tsx'
import { AdminMessagesPage } from '@/features/admin/pages/AdminMessagesPage.tsx'
import FundraiserPage from '@/features/fundraisers/pages/FundraiserPage'


export const router = createBrowserRouter([
  // Public: auth layout
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
      { path: '/activate-account', element: <ActivateAccountPage /> },
    ],
  },

  // Signed in
  {
    element: <RequireAuth />,
    children: [
      // Parents
      {
        element: <RequireRole allow="PARENT" />,
        children: [
          {
            element: <AppLayout items={PARENT_NAV} />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/children', element: <ChildrenPage /> },
              { path: '/classes', element: <ClassesPage /> },
              { path: '/classes/:classId', element: <ClassPage /> },
              { path: '/account', element: <WalletPage /> },
              { path: '/chat', element: <ChatPage /> },
              { path: '/chat/:chatId', element: <ChatPage /> },
              { path: '/reports', element: <ReportsPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/fundraisers/:fundraiserId', element: <FundraiserPage /> },
            ],
          },
        ],
      },

      // Administrators
      {
        path: '/admin',
        element: <RequireRole allow="ADMIN" />,
        children: [
          {
            element: <AppLayout items={ADMIN_NAV} />,
            children: [
              { index: true, element: <Navigate to="users" replace /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'fundraisers', element: <AdminFundraisersPage /> },
              { path: 'messages', element: <AdminMessagesPage /> },
            ],
          },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
