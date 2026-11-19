import { useState } from 'react'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'

import PageHeader from '@/components/PageHeader'
import PageSection from '@/components/PageSection'
import WhiteCard from '@/components/WhiteCard'
import { useAdminOverview } from '@/features/admin/api'
import {
  downloadReport,
  type ReportFormat,
  type ReportLanguage,
} from '@/features/reports/api'
import ReportAccountSummary from '@/features/reports/components/ReportAccountSummary'
import ReportDownload from '@/features/reports/components/ReportDownload'
import ReportFinancialSummary from '@/features/reports/components/ReportFinancialSummary'
import ReportTable from '@/features/reports/components/ReportTable'

export function AdminOverviewPage() {
  const [language, setLanguage] = useState<ReportLanguage>('pl')
  const [downloading, setDownloading] = useState<ReportFormat | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const overview = useAdminOverview()

  const handleDownload = async (format: ReportFormat) => {
    try {
      setDownloading(format)
      setDownloadError(null)
      await downloadReport('system', 'system', format, language)
    } catch {
      setDownloadError(
        'Could not download the system report. Please try again.',
      )
    } finally {
      setDownloading(null)
    }
  }

  const stats = [
    {
      label: 'Classes',
      value: overview.data ? String(overview.data.classes_count) : '—',
    },
    {
      label: 'Parents',
      value: overview.data ? String(overview.data.parents_count) : '—',
    },
    {
      label: 'Treasurers',
      value: overview.data ? String(overview.data.treasurers_count) : '—',
    },
    {
      label: 'Active fundraisers',
      value: overview.data
        ? String(overview.data.active_fundraisers_count)
        : '—',
    },
  ]

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      <PageHeader
        title="Overview"
        subtitle="System-wide financial summary, class breakdown and report exports."
      />

      {overview.isPending && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {overview.isError && (
        <Alert severity="error">
          Could not load the system overview. Please try again.
        </Alert>
      )}

      {overview.data && (
        <>
          <PageSection title="Platform summary">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, minmax(0, 1fr))',
                  md: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              {stats.map((item) => (
                <WhiteCard key={item.label} padding={2.5}>
                  <Stack spacing={1}>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', fontWeight: 500 }}
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '1.125rem',
                        fontWeight: 'bold',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {item.value}
                    </Typography>
                  </Stack>
                </WhiteCard>
              ))}
            </Box>
          </PageSection>

          <ReportFinancialSummary
            contributions={overview.data.report.contributions}
          />

          {overview.data.report.account && (
            <ReportAccountSummary account={overview.data.report.account} />
          )}

          <PageSection title="Breakdown by class">
            <ReportTable rows={overview.data.report.rows} scope="system" />
          </PageSection>

          <PageSection title="Export">
            <ReportDownload
              language={language}
              onLanguageChange={setLanguage}
              onDownload={handleDownload}
              downloading={downloading}
              error={downloadError}
            />
          </PageSection>
        </>
      )}
    </Stack>
  )
}
