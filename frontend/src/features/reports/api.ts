import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

export type ReportScope = 'fundraiser' | 'child' | 'class' | 'system'
export type ReportLanguage = 'pl' | 'en'
export type ReportFormat = 'csv' | 'pdf'

export type ContributionTotals = {
  expected_total: string
  paid_total: string
  refunded_total: string
  net_paid_total: string
}

export type AccountTotals = {
  current_balance: string
  treasurer_deposited_total: string
  treasurer_withdrawn_total: string
}

export type ReportRow = {
  id: string
  name: string
  contributions: ContributionTotals
  account: AccountTotals | null
}

export type FinancialReport = ReportRow & {
  scope: ReportScope
  currency: 'PLN'
  rows: ReportRow[]
}

export const reportKeys = {
  all: ['reports'] as const,
  detail: (scope: ReportScope, subjectId: string) =>
    [...reportKeys.all, scope, subjectId] as const,
}

export function useReport(scope: ReportScope, subjectId: string) {
  return useQuery<FinancialReport>({
    queryKey: reportKeys.detail(scope, subjectId),
    queryFn: () => api.get<FinancialReport>(`/reports/${scope}/${subjectId}`),
    enabled: !!subjectId,
  })
}

export async function downloadReport(
  scope: ReportScope,
  subjectId: string,
  format: ReportFormat,
  lang: ReportLanguage,
) {
  const params = new URLSearchParams({
    format,
    lang,
  })

  const endpoint =
    scope === 'system'
      ? `/admin/report/export?${params.toString()}`
      : `/reports/${scope}/${subjectId}/export?${params.toString()}`

  const blob = await api.getBlob(endpoint)

  const mimeType =
    format === 'csv' ? 'text/csv;charset=utf-8' : 'application/pdf'

  const file = new Blob([blob], {
    type: mimeType,
  })

  const url = window.URL.createObjectURL(file)

  const link = document.createElement('a')
  link.href = url
  link.download =
    scope === 'system'
      ? `system-report.${format}`
      : `${scope}-${subjectId}.${format}`

  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url)
  }, 1000)
}
