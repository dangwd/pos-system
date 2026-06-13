'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { createInventoryListColumns } from '@/components/admin/columns/inventory-list-columns'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useInventory } from '@/hooks/useInventory'
import { useAuthStore } from '@/stores/auth.store'
import type { InventoryStatus, InventorySource } from '@/types/inventory'

const PAGE_SIZE = 20

const STATUS_FILTER_VALUES: InventoryStatus[] = [
  'TiepNhan', 'DaDinhGia', 'TrenQuay', 'ChuyenXuong', 'DaBan', 'DoiRa',
]

export default function InventoryPage() {
  const t = useTranslations('admin.inventory')
  const router = useRouter()
  const user = useAuthStore(s => s.user)
  const canManage = !!user?.permissions.includes('INVENTORY_MANAGE')

  // ─── Filter state ────────────────────────────────────────────────────────
  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [status, setStatus] = useState<InventoryStatus | null>(null)
  const [nguonGoc, setNguonGoc] = useState<InventorySource | null>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  // ─── Data ─────────────────────────────────────────────────────────────────
  const effectiveBranchId = branchId ?? user?.branchId ?? null
  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(effectiveBranchId)

  const [prevBranch, setPrevBranch] = useState(effectiveBranchId)
  if (effectiveBranchId !== prevBranch) {
    setPrevBranch(effectiveBranchId)
    setCounterId(null)
    setPage(1)
  }

  const [prevFilters, setPrevFilters] = useState({ status, nguonGoc, category, keyword })
  const currentFilters = { status, nguonGoc, category, keyword }
  const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(prevFilters)
  if (filtersChanged) {
    setPrevFilters(currentFilters)
    setPage(1)
  }

  const { data: paged, isLoading } = useInventory({
    branchId: effectiveBranchId ?? undefined,
    counterId: counterId ?? undefined,
    status: status ?? undefined,
    nguonGoc: nguonGoc ?? undefined,
    category: category ?? undefined,
    keyword: keyword.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const rows = paged?.data ?? []

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>()
    const out: { value: string; label: string }[] = []
    rows.forEach(r => {
      if (r.category && !seen.has(r.category)) {
        seen.add(r.category)
        out.push({ value: r.category, label: r.category })
      }
    })
    return out
  }, [rows])

  // ─── Columns ──────────────────────────────────────────────────────────────
  const statusLabels = useMemo<Record<InventoryStatus, string>>(() => ({
    TiepNhan:    t('statusTiepNhan'),
    DaDinhGia:   t('statusDaDinhGia'),
    TrenQuay:    t('statusTrenQuay'),
    ChuyenXuong: t('statusChuyenXuong'),
    DaBan:       t('statusDaBan'),
    DoiRa:       t('statusDoiRa'),
  }), [t])

  const columns = useMemo(() => createInventoryListColumns({
    labels: {
      productCode: t('columns.productCode'),
      productName: t('columns.productName'),
      purity:      t('columns.purity'),
      counter:     t('columns.counter'),
      source:      t('columns.source'),
      sourceQuan:  t('sourceQuan'),
      sourceNgoai: t('sourceNgoai'),
      qty:         t('columns.qty'),
      weight:      t('columns.weight'),
      status:      t('columns.status'),
      statusLabels,
      updatedAt:   t('columns.updatedAt'),
    },
  }), [t, statusLabels])

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('list.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('list.subtitle', { count: paged?.total ?? 0 })}
          </p>
        </div>
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push('/admin/inventory/adjustments')}
          >
            <ClipboardList className="h-4 w-4" />
            {t('list.adjustmentsLink')}
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <ComboboxSelect
          value={effectiveBranchId}
          onChange={v => setBranchId(v)}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          placeholder={t('filterBranch')}
          className="w-44"
        />
        <ComboboxSelect
          value={counterId}
          onChange={v => setCounterId(v)}
          options={counters.map(c => ({ value: c.id, label: c.counterName }))}
          placeholder={t('filterCounter')}
          className="w-40"
          clearable
        />
        <ComboboxSelect
          value={status}
          onChange={v => setStatus((v as InventoryStatus) ?? null)}
          options={STATUS_FILTER_VALUES.map(s => ({ value: s, label: statusLabels[s] }))}
          placeholder={t('filterStatus')}
          className="w-40"
          clearable
        />
        <ComboboxSelect
          value={nguonGoc}
          onChange={v => setNguonGoc((v as InventorySource) ?? null)}
          options={[
            { value: 'Quan',  label: t('sourceQuan') },
            { value: 'Ngoai', label: t('sourceNgoai') },
          ]}
          placeholder={t('filterSource')}
          className="w-36"
          clearable
        />
        {categoryOptions.length > 0 && (
          <ComboboxSelect
            value={category}
            onChange={v => setCategory(v)}
            options={categoryOptions}
            placeholder={t('filterCategory')}
            className="w-40"
            clearable
          />
        )}
        <Input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder={t('filterKeyword')}
          className="w-56"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TablePageSkeleton cols={10} rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          hideSearch
          onRowClick={item => router.push(`/admin/inventory/${item.id}`)}
          serverPagination={paged ? {
            total: paged.total,
            page: paged.page,
            pageSize: paged.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}
    </div>
  )
}
