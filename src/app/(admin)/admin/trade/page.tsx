'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tradeRepository } from '@/lib/repositories/trade.repository'
import { DataTable } from '@/components/pos/DataTable'
import { createTradeColumns } from '@/components/pos/columns/trade-columns'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import type { TradeType } from '@/types/trade'

type Filter = 'all' | TradeType

export default function TradePage() {
  const t = useTranslations('admin.trade')
  const [filter, setFilter] = useState<Filter>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['trade', filter],
    queryFn: () => tradeRepository.getList(
      filter === 'all' ? {} : { loai: filter }
    ),
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
      BuyIn:        t('types.BuyIn'),
      ExchangeGold: t('types.ExchangeGold'),
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
          {(['all', 'BuyIn', 'ExchangeGold'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? t('filterAll') : f === 'BuyIn' ? t('filterBuyIn') : t('filterExchange')}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchKey="invoiceCode"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
    </div>
  )
}
