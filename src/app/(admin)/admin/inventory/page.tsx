'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { DataTable } from '@/components/shared/DataTable'
import { createInventoryColumns } from '@/components/admin/columns/inventory-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useInventory } from '@/hooks/useInventory'
import { useBranches } from '@/hooks/useBranches'
import type { InventoryStatus, InventorySource } from '@/types/inventory'

const ALL = '__all__'
const PAGE_SIZE = 20

export default function InventoryPage() {
  const t = useTranslations('admin.inventory')

  const [page, setPage] = useState(1)
  const [filterBranchId, setFilterBranchId] = useState(ALL)
  const [filterStatus, setFilterStatus] = useState(ALL)
  const [filterSource, setFilterSource] = useState(ALL)

  const handleBranchChange = (v: string | null) => { setFilterBranchId(v ?? ALL); setPage(1) }
  const handleStatusChange = (v: string | null) => { setFilterStatus(v ?? ALL); setPage(1) }
  const handleSourceChange = (v: string | null) => { setFilterSource(v ?? ALL); setPage(1) }

  const { data: branches = [] } = useBranches()

  const { data, isLoading } = useInventory({
    branchId: filterBranchId !== ALL ? filterBranchId : undefined,
    status: filterStatus !== ALL ? (filterStatus as InventoryStatus) : undefined,
    nguonGoc: filterSource !== ALL ? (filterSource as InventorySource) : undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const items = data?.data ?? []

  const columns = useMemo(() => createInventoryColumns({
    product:    t('columns.product'),
    branch:     t('columns.branch'),
    qty:        t('columns.qty'),
    weight:     t('columns.weight'),
    status:     t('filterStatus'),
    source:     t('filterSource'),
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
          {t('subtitle', { count: data?.total ?? 0 })}
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterBranchId} onValueChange={handleBranchChange}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder={t('filterBranch')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            {branches.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            <SelectItem value="TiepNhan">{t('statusTiepNhan')}</SelectItem>
            <SelectItem value="TrenQuay">{t('statusTrenQuay')}</SelectItem>
            <SelectItem value="DaBan">{t('statusDaBan')}</SelectItem>
            <SelectItem value="ChuyenXuong">{t('statusChuyenXuong')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={handleSourceChange}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder={t('filterSource')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            <SelectItem value="Quan">{t('sourceQuan')}</SelectItem>
            <SelectItem value="Ngoai">{t('sourceNgoai')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={items}
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
