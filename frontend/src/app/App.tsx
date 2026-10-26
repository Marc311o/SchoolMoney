import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import { queryClient } from '@/app/queryClient'
import { router } from '@/app/router'
import ThemeProvider from '@/styles/ThemeProvider'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
