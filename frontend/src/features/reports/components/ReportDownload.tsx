import {
  Alert,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Box,
} from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import AppButton from '@/components/AppButton'
import AppButtonOutlined from '@/components/AppButtonOutlined'

import type { ReportFormat, ReportLanguage } from '@/features/reports/api'

type Props = {
  language: ReportLanguage
  onLanguageChange: (language: ReportLanguage) => void
  onDownload: (format: ReportFormat) => void
  downloading: ReportFormat | null
  error: string | null
}

export default function ReportDownload({
  language,
  onLanguageChange,
  onDownload,
  downloading,
  error,
}: Props) {
  return (
    <WhiteCard padding={2.5}>
      <Stack spacing={2.5}>
        <Typography variant="body2" color="text.secondary">
          Choose the export language and file format.
        </Typography>

        {/* Export language */}

        <Box>
          <TextField
            select
            fullWidth
            size="small"
            label="Export language"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as ReportLanguage)
            }
            sx={{ maxWidth: { xs: '100%', sm: 260 } }}
            disabled={downloading !== null}
          >
            <MenuItem value="pl">Polski</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </TextField>
        </Box>

        {/* Download buttons */}

        <Stack
          direction="row"
          spacing={2}
          sx={{
            width: '100%',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          <AppButtonOutlined
            label={downloading === 'csv' ? 'Downloading...' : 'Download CSV'}
            onClick={() => onDownload('csv')}
            disabled={downloading !== null}
          />

          <AppButton
            label={downloading === 'pdf' ? 'Downloading...' : 'Download PDF'}
            onClick={() => onDownload('pdf')}
            loading={downloading === 'pdf'}
            disabled={downloading !== null}
          />
        </Stack>

        {/* Error */}

        {error && <Alert severity="error">{error}</Alert>}
      </Stack>
    </WhiteCard>
  )
}
