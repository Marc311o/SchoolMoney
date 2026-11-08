import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export type FundraiserFilterValue = 'all' | 'active' | 'closed'

interface FundraiserFilterProps {
  value: FundraiserFilterValue
  onChange: (value: FundraiserFilterValue) => void
}

export default function FundraiserFilter({
  value,
  onChange,
}: FundraiserFilterProps) {
  const handleChange = (
    _: React.MouseEvent<HTMLElement>,
    newValue: FundraiserFilterValue | null,
  ) => {
    if (newValue) {
      onChange(newValue)
    }
  }

  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          textTransform: 'none',
          px: 2,
          fontWeight: 600,
          borderColor: 'divider',
          color: 'text.secondary',
        },
        '& .MuiToggleButton-root.Mui-selected': {
          color: 'primary.main',
          backgroundColor: 'primary.50',
        },
      }}
    >
      <ToggleButton value="all">All</ToggleButton>
      <ToggleButton value="active">Active</ToggleButton>
      <ToggleButton value="closed">Closed</ToggleButton>
    </ToggleButtonGroup>
  )
}
