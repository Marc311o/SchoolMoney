import { IconButton, Stack, Tooltip, Typography } from '@mui/material'
import type { ReactNode } from 'react'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'

import SelectChips from '@/components/SelectChips'

interface TablePagerProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizes?: number[]
}

export default function TablePager({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
}: TablePagerProps) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)
  const hasPrevious = page > 1
  const hasNext = last < total

  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-end',
        columnGap: 3,
        rowGap: 1,
        px: 2,
        py: 1.25,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Rows per page
        </Typography>
        <SelectChips
          label="Rows per page"
          options={pageSizes.map((size) => ({
            value: String(size),
            label: String(size),
          }))}
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange(Number(value))}
          fullWidth={false}
        />
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: 14, minWidth: 90, textAlign: 'right' }}>
          {first}–{last} of {total}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <PagerButton
            label="Previous page"
            disabled={!hasPrevious}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftRoundedIcon fontSize="small" />
          </PagerButton>
          <PagerButton
            label="Next page"
            disabled={!hasNext}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRightRoundedIcon fontSize="small" />
          </PagerButton>
        </Stack>
      </Stack>
    </Stack>
  )
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip title={disabled ? '' : label}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  )
}
