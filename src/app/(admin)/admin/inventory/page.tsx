'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { DataTable } from '@/components/shared/DataTable'
import { createInventoryColumns } from '@/components/admin/columns/inventory-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { useInventory } from '@/hooks/useInventory'
import { useBranches } from '@/hooks/useBranches'
import type { InventoryStatus, InventorySource } from '@/types/inventory'

const PAGE_SIZE = 20

const TRIGGER = "inline-flex h-8 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm font-normal hover:bg-accent hover:text-accent-foreground transition-colors w-full"

export default function InventoryPage() {
  const t = useTranslations('admin.inventory')

  const branchAnchor = useRef<HTMLDivElement>(null)
  const statusAnchor = useRef<HTMLDivElement>(null)
  const sourceAnchor = useRef<HTMLDivElement>(null)

  const [page, setPage] = useState(1)
  const [filterBranchId, setFilterBranchId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState<string | null>(null)

  const { data: branches = [] } = useBranches()

  const statusLabels = useMemo(() => ({
    TiepNhan:    t('statusTiepNhan'),
    TrenQuay:    t('statusTrenQuay'),
    DaBan:       t('statusDaBan'),
    ChuyenXuong: t('statusChuyenXuong'),
  }), [t])

  const sourceLabels = useMemo(() => ({
    Quan:  t('sourceQuan'),
    Ngoai: t('sourceNgoai'),
  }), [t])

  const selectedBranch = branches.find(b => b.id === filterBranchId)

  const { data, isLoading } = useInventory({
    branchId: filterBranchId ?? undefined,
    status: filterStatus as InventoryStatus ?? undefined,
    nguonGoc: filterSource as InventorySource ?? undefined,
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
        {/* Branch */}
        <div ref={branchAnchor} className="inline-flex min-w-48">
          <Combobox
            value={filterBranchId ?? ""}
            onValueChange={v => { setFilterBranchId(v || null); setPage(1) }}
          >
            <ComboboxTrigger className={TRIGGER}>
              {selectedBranch
                ? selectedBranch.name
                : <span className="text-muted-foreground">{t('filterBranch')}</span>
              }
            </ComboboxTrigger>
            <ComboboxContent anchor={branchAnchor}>
              <ComboboxInput placeholder={t('filterBranch')} />
              <ComboboxList>
                <ComboboxItem value="">{t('filterAll')}</ComboboxItem>
                {branches.map(b => (
                  <ComboboxItem key={b.id} value={b.id}>{b.name}</ComboboxItem>
                ))}
              </ComboboxList>
              <ComboboxEmpty>Không tìm thấy</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </div>

        {/* Status */}
        <div ref={statusAnchor} className="inline-flex min-w-40">
          <Combobox
            value={filterStatus ?? ""}
            onValueChange={v => { setFilterStatus(v || null); setPage(1) }}
          >
            <ComboboxTrigger className={TRIGGER}>
              {filterStatus
                ? statusLabels[filterStatus as keyof typeof statusLabels] ?? filterStatus
                : <span className="text-muted-foreground">{t('filterStatus')}</span>
              }
            </ComboboxTrigger>
            <ComboboxContent anchor={statusAnchor}>
              <ComboboxInput placeholder={t('filterStatus')} />
              <ComboboxList>
                <ComboboxItem value="">{t('filterAll')}</ComboboxItem>
                <ComboboxItem value="TiepNhan">{statusLabels.TiepNhan}</ComboboxItem>
                <ComboboxItem value="TrenQuay">{statusLabels.TrenQuay}</ComboboxItem>
                <ComboboxItem value="DaBan">{statusLabels.DaBan}</ComboboxItem>
                <ComboboxItem value="ChuyenXuong">{statusLabels.ChuyenXuong}</ComboboxItem>
              </ComboboxList>
              <ComboboxEmpty>Không tìm thấy</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </div>

        {/* Source */}
        <div ref={sourceAnchor} className="inline-flex min-w-36">
          <Combobox
            value={filterSource ?? ""}
            onValueChange={v => { setFilterSource(v || null); setPage(1) }}
          >
            <ComboboxTrigger className={TRIGGER}>
              {filterSource
                ? sourceLabels[filterSource as keyof typeof sourceLabels] ?? filterSource
                : <span className="text-muted-foreground">{t('filterSource')}</span>
              }
            </ComboboxTrigger>
            <ComboboxContent anchor={sourceAnchor}>
              <ComboboxInput placeholder={t('filterSource')} />
              <ComboboxList>
                <ComboboxItem value="">{t('filterAll')}</ComboboxItem>
                <ComboboxItem value="Quan">{sourceLabels.Quan}</ComboboxItem>
                <ComboboxItem value="Ngoai">{sourceLabels.Ngoai}</ComboboxItem>
              </ComboboxList>
              <ComboboxEmpty>Không tìm thấy</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </div>
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
