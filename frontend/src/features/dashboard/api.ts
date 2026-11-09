import { useQuery } from '@tanstack/react-query'

import type { Fundraiser } from '@/features/fundraisers/api'
import { api, ApiError } from '@/lib/api'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  fundraisers: () => [...dashboardKeys.all, 'fundraisers'] as const,
}

export function useDashboardFundraisers() {
  return useQuery<Fundraiser[], ApiError>({
    queryKey: dashboardKeys.fundraisers(),
    queryFn: () => api.get<Fundraiser[]>('/fundraisers'),
  })
}
