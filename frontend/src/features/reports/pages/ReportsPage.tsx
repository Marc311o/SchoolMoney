import { useMemo, useState } from 'react'

import { Alert, Box, CircularProgress, Stack } from '@mui/material'

import PageHeader from '@/components/PageHeader'

import { useChildren } from '@/features/children/api'
import { useClasses } from '@/features/classes/api'
import { useFundraisers } from '@/features/fundraisers/api'

import {
  downloadReport,
  useReport,
  type ReportScope,
  type ReportFormat,
  type ReportLanguage,
} from '@/features/reports/api'

import ReportFilters from '@/features/reports/components/ReportFilters'
import ReportFinancialSummary from '@/features/reports/components/ReportFinancialSummary'
import ReportAccountSummary from '@/features/reports/components/ReportAccountSummary'
import ReportDownload from '@/features/reports/components/ReportDownload'
import ReportTable from '@/features/reports/components/ReportTable'
import PageSection from '@/components/PageSection'

export function ReportsPage() {
  // Queries

  const { data: children = [], isPending: childrenPending } = useChildren()

  const {
    data: classes = [],
    isPending: classesPending,
    isError: classesError,
  } = useClasses()

  // Permissions

  const treasurerClasses = useMemo(
    () => classes.filter((item) => item.my_role === 'TREASURER'),
    [classes],
  )

  const hasTreasurerAccess = treasurerClasses.length > 0

  // State

  const [scope, setScope] = useState<ReportScope>('child')
  const [subjectId, setSubjectId] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [language, setLanguage] = useState<ReportLanguage>('pl')
  const [downloading, setDownloading] = useState<ReportFormat | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Fundraisers

  const {
    data: fundraisers = [],
    isPending: fundraisersPending,
    isError: fundraisersError,
  } = useFundraisers(scope === 'fundraiser' ? selectedClassId : '')

  // Selected entities

  const selectedChild = children.find((child) => child.id === subjectId)

  const selectedClass = treasurerClasses.find(
    (item) => item.id === (scope === 'class' ? subjectId : selectedClassId),
  )

  const selectedFundraiser = fundraisers.find((item) => item.id === subjectId)

  // Validate selection

  const hasValidSelection =
    scope === 'child'
      ? Boolean(selectedChild)
      : scope === 'class'
        ? Boolean(selectedClass)
        : Boolean(selectedClass && selectedFundraiser)

  // Report query

  const {
    data: report,
    isPending: reportPending,
    error: reportError,
  } = useReport(scope, hasValidSelection ? subjectId : '')

  // Handlers

  const handleScopeChange = (value: ReportScope) => {
    if (value !== 'child' && !hasTreasurerAccess) return

    setScope(value)
    setSubjectId('')
    setSelectedClassId('')
    setDownloadError(null)
  }

  const handleChildChange = (childId: string) => {
    setSubjectId(childId)
    setDownloadError(null)
  }

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setSubjectId(scope === 'class' ? classId : '')
    setDownloadError(null)
  }

  const handleFundraiserChange = (fundraiserId: string) => {
    setSubjectId(fundraiserId)
    setDownloadError(null)
  }

  const handleDownload = async (format: ReportFormat) => {
    if (!hasValidSelection) return

    try {
      setDownloading(format)
      setDownloadError(null)

      await downloadReport(scope, subjectId, format, language)
    } catch {
      setDownloadError('Could not download the report. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  // Loading

  if (childrenPending || classesPending) {
    return <CircularProgress sx={{ m: 4 }} />
  }

  // Render

  return (
    <Stack spacing={3} sx={{ p: '1em' }}>
      <PageHeader
        title="Reports"
        subtitle="View and download financial reports."
      />

      {/* Filters */}

      <ReportFilters
        scope={scope}
        subjectId={subjectId}
        selectedClassId={selectedClassId}
        childList={children}
        classes={treasurerClasses}
        fundraisers={fundraisers}
        hasTreasurerAccess={hasTreasurerAccess}
        classesError={classesError}
        fundraisersError={fundraisersError}
        fundraisersPending={fundraisersPending}
        onScopeChange={handleScopeChange}
        onChildChange={handleChildChange}
        onClassChange={handleClassChange}
        onFundraiserChange={handleFundraiserChange}
      />

      {/* Report loading */}

      {hasValidSelection && reportPending && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            p: 4,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Report error */}

      {hasValidSelection && reportError && (
        <Alert severity="error">
          Could not load report. You may not have permission to access this
          report.
        </Alert>
      )}

      {/* Report content */}

      {report && hasValidSelection && (
        <>
          {/* Financial summary */}

          <ReportFinancialSummary contributions={report.contributions} />

          {/* Account summary */}

          {report.account && <ReportAccountSummary account={report.account} />}

          {/* Report table */}

          {report.rows && <ReportTable rows={report.rows} scope={scope} />}

          {/* Download */}

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
