'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { DataTable } from '@/components/pos/DataTable'
import { createInventoryColumns } from '@/components/pos/columns/inventory-columns'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function InventoryPage() {
  const t = useTranslations('admin.inventory')

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryRepository.getList(),
    staleTime: 60_000,
  })

  const columns = useMemo(() => createInventoryColumns({
    product:    t('columns.product'),
    branch:     t('columns.branch'),
    qty:        t('columns.qty'),
    status:     'Status',
    source:     'Source',
    tray:       'Tray',
    updatedAt:  t('columns.lastUpdated'),
    openMenu:   'Open menu',
    viewDetail: 'View details',
  }), [t])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle', { count: items.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={items}
          searchKey="productName"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
    </div>
  )
}
