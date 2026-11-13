import { useState } from 'react'
import { CircularProgress, Link, Stack, Typography } from '@mui/material'

import WhiteCard from '@/components/WhiteCard'
import AppButtonOutlined from '@/components/AppButtonOutlined'
import EmptyState from '@/components/EmptyState'
import PageSection from '@/components/PageSection'
import { formatMoney } from '@/lib/money'
import type { Invoice } from '@/features/fundraisers/api'

interface FundraiserInvoicesProps {
  invoices: Invoice[]
  loading?: boolean
}

const ITEMS_LIMIT = 1

export default function FundraiserInvoices({
  invoices,
  loading = false,
}: FundraiserInvoicesProps) {
  const [showAll, setShowAll] = useState(false)

  const formatDate = (value: string) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return '—'

    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    })
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={28} />
      </Stack>
    )
  }

  const visibleInvoices = showAll ? invoices : invoices.slice(0, ITEMS_LIMIT)

  return (
    <PageSection
      title="Invoices"
      count={invoices.length}
      action={
        invoices.length > ITEMS_LIMIT ? (
          <AppButtonOutlined
            label={showAll ? 'Show less' : 'Show all'}
            onClick={() => setShowAll((prev) => !prev)}
          />
        ) : undefined
      }
    >
      {invoices.length === 0 ? (
        <EmptyState dashed description="No invoices yet." />
      ) : (
        <Stack spacing={1.5}>
          {visibleInvoices.map((invoice) => (
            <WhiteCard key={invoice.id}>
              <Stack spacing={0.5} sx={{ px: 1, py: 0.5 }}>
                <Stack
                  sx={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 'bold',
                      color: 'text.primary',
                      overflowWrap: 'anywhere',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {invoice.title}
                  </Typography>

                  {invoice.amount && (
                    <Typography
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        color: 'text.primary',
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {formatMoney(invoice.amount)}
                    </Typography>
                  )}
                </Stack>

                <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                  {formatDate(invoice.created_at)}
                </Typography>

                <Link
                  href={invoice.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  sx={{ fontSize: 14, width: 'fit-content' }}
                >
                  View invoice
                </Link>
              </Stack>
            </WhiteCard>
          ))}
        </Stack>
      )}
    </PageSection>
  )
}
