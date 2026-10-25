import { createBrowserRouter } from 'react-router'

import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { ChildrenPage } from '@/features/children/pages/ChildrenPage'
import { ClassesPage } from '@/features/classes/pages/ClassesPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { WalletPage } from '@/features/wallet/pages/WalletPage'
import { AppLayout } from '@/layouts/AppLayout.tsx'
import { AuthLayout } from '@/layouts/AuthLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  // Public: not signed in
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Signed in
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/children', element: <ChildrenPage /> },
      { path: '/classes', element: <ClassesPage /> },
      { path: '/account', element: <WalletPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])
