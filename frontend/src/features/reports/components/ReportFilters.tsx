import { Box, Alert, MenuItem, TextField } from '@mui/material'

import PageSection from '@/components/PageSection'
import WhiteCard from '@/components/WhiteCard'

import type { ReportScope } from '@/features/reports/api'

interface ReportFiltersProps {
  scope: ReportScope
  subjectId: string
  selectedClassId: string

  childList: {
    id: string
    first_name: string
    last_name: string
  }[]

  classes: {
    id: string
    name: string
  }[]

  fundraisers: {
    id: string
    name: string
  }[]

  hasTreasurerAccess: boolean

  classesError: boolean
  fundraisersError: boolean
  fundraisersPending: boolean

  onScopeChange: (scope: ReportScope) => void
  onChildChange: (childId: string) => void
  onClassChange: (classId: string) => void
  onFundraiserChange: (fundraiserId: string) => void
}

export default function ReportFilters({
  scope,
  subjectId,
  selectedClassId,
  childList,
  classes,
  fundraisers,
  hasTreasurerAccess,
  classesError,
  fundraisersError,
  fundraisersPending,
  onScopeChange,
  onChildChange,
  onClassChange,
  onFundraiserChange,
}: ReportFiltersProps) {
  return (
    <PageSection title="Report selection">
      <WhiteCard padding={2.5}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
            alignItems: 'start',
          }}
        >
          <TextField
            select
            fullWidth
            label="Report type"
            value={scope}
            onChange={(event) =>
              onScopeChange(event.target.value as ReportScope)
            }
          >
            <MenuItem value="child">Child report</MenuItem>

            <MenuItem value="class" disabled={!hasTreasurerAccess}>
              Class report
            </MenuItem>

            <MenuItem value="fundraiser" disabled={!hasTreasurerAccess}>
              Fundraiser report
            </MenuItem>
          </TextField>

          {scope === 'child' && (
            <TextField
              select
              fullWidth
              label="Select child"
              value={subjectId}
              onChange={(event) => onChildChange(event.target.value)}
            >
              {childList.map((child) => (
                <MenuItem key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {(scope === 'class' || scope === 'fundraiser') && (
            <TextField
              select
              fullWidth
              label="Select class"
              value={scope === 'class' ? subjectId : selectedClassId}
              onChange={(event) => onClassChange(event.target.value)}
            >
              {classes.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {scope === 'fundraiser' &&
            selectedClassId &&
            fundraisersPending === false &&
            !fundraisersError &&
            fundraisers.length > 0 && (
              <TextField
                select
                fullWidth
                label="Select fundraiser"
                value={subjectId}
                onChange={(event) => onFundraiserChange(event.target.value)}
              >
                {fundraisers.map((fundraiser) => (
                  <MenuItem key={fundraiser.id} value={fundraiser.id}>
                    {fundraiser.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
        </Box>

        {classesError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Could not load classes. Please refresh the page.
          </Alert>
        )}

        {!hasTreasurerAccess && !classesError && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Class and fundraiser reports are available to class treasurers.
          </Alert>
        )}

        {scope === 'child' && childList.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            You don't have any children assigned to your account.
          </Alert>
        )}

        {scope === 'fundraiser' &&
          selectedClassId &&
          !fundraisersPending &&
          !fundraisersError &&
          fundraisers.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No fundraisers found in this class.
            </Alert>
          )}

        {scope === 'fundraiser' && fundraisersError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Could not load fundraisers. Please try again.
          </Alert>
        )}
      </WhiteCard>
    </PageSection>
  )
}
