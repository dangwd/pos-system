'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tradeRepository } from '@/lib/repositories/trade.repository'
import { DataTable } from '@/components/shared/DataTable'
import { createTradeColumns } from '@/components/admin/columns/trade-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import type { TradeType } from '@/types/trade'

type Filter = 'all' | TradeType

const PAGE_SIZE = 20

export default function TradePage() {
  const t = useTranslations('admin.trade')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['trade', filter, page],
    queryFn: () => tradeRepository.getList({
      ...(filter === 'all' ? {} : { loai: filter }),
      page,
      limit: PAGE_SIZE,
    }),
    staleTime: 30_000,
  })

  const rows = data?.data ?? []

  const columns = useMemo(() => createTradeColumns({
    invoiceCode: t('columns.invoiceCode'),
    type:        t('columns.type'),
    product:     t('columns.product'),
    weight:      t('columns.weight'),
    total:       t('columns.total'),
    date:        t('columns.date'),
    openMenu:    t('columns.invoiceCode'),
    viewDetail:  'View',
    typeLabels: {
      DoiHang:      t('types.DoiHang'),
      MuaThem:      t('types.MuaThem'),
      DoiMienPhi:   t('types.DoiMienPhi'),
      DoiThanhTien: t('types.DoiThanhTien'),
    },
  }), [t])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle', { total: data?.total ?? 0 })}
          </p>
        </div>

        <div className="flex gap-1.5">
          {(['all', 'DoiHang', 'MuaThem', 'DoiMienPhi', 'DoiThanhTien'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => { setFilter(f); setPage(1) }}
            >
              {f === 'all' ? t('filterAll') : t(`types.${f}`)}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={rows}
          hideSearch
          serverPagination={data ? {
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}
    </div>
  )
}
