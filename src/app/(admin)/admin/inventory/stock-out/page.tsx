'use client'

// StockOutPage — danh sách sản phẩm + detail panel inline bên dưới

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowUpFromLine, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { InventoryBulkAdjustDialog } from '@/components/admin/inventory/InventoryBulkAdjustDialog'
import { createInventoryListColumns } from '@/components/admin/columns/inventory-list-columns'
import { createStockOutListColumns } from '@/components/admin/columns/stock-out-list-columns'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useInventory, useInventoryItem, useInventoryAdjustments } from '@/hooks/useInventory'
import { useAuthStore } from '@/stores/auth.store'
import type { InventoryItem, InventoryStatus } from '@/types/inventory'

const PAGE_SIZE = 20
const ADJ_PAGE_SIZE = 20

// ─── Status badge styles ─────────────────────────────────────────────────────

const STATUS_CLASS: Record<InventoryStatus, string> = {
  TiepNhan:    'bg-muted text-muted-foreground',
  DaDinhGia:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TrenQuay:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ChuyenXuong: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DaBan:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DoiRa:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  item: InventoryItem
  onClose: () => void
}

function StockOutDetailPanel({ item, onClose }: DetailPanelProps) {
  const t = useTranslations('admin.inventory.stockOut')
  const tInv = useTranslations('admin.inventory')
  const tAdj = useTranslations('admin.inventory.adjustments')
  const [adjPage, setAdjPage] = useState(1)

  const { data: adjPaged, isLoading: adjLoading } = useInventoryAdjustments(
    { inventoryItemId: item.id, direction: 'OUT', page: adjPage, pageSize: ADJ_PAGE_SIZE },
    true,
  )

  const statusLabels = useMemo<Record<InventoryStatus, string>>(() => ({
    TiepNhan:    tInv('statusTiepNhan'),
    DaDinhGia:   tInv('statusDaDinhGia'),
    TrenQuay:    tInv('statusTrenQuay'),
    ChuyenXuong: tInv('statusChuyenXuong'),
    DaBan:       tInv('statusDaBan'),
    DoiRa:       tInv('statusDoiRa'),
  }), [tInv])

  const adjColumns = useMemo(() => createStockOutListColumns({
    code:     t('columns.code'),
    product:  t('columns.product'),
    counter:  t('columns.counter'),
    quantity: t('columns.quantity'),
    weight:   t('columns.weight'),
    reason:   t('columns.reason'),
    date:     t('columns.date'),
  }), [t])

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Product info header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">{item.productCode}</span>
            {item.purity && <Badge variant="secondary" className="text-[10px]">{item.purity}</Badge>}
            <Badge variant="secondary" className={`text-[10px] ${STATUS_CLASS[item.trangThai]}`}>
              {statusLabels[item.trangThai]}
            </Badge>
          </div>
          <h2 className="text-base font-semibold">{item.productName}</h2>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{item.counterName}</span>
            <span className="tabular-nums font-semibold text-foreground">
              {item.quantity} {tInv('detail.qty')} · {item.weightGram.toLocaleString('lo-LA', { maximumFractionDigits: 2 })} g
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* OUT adjustment history */}
      <div className="p-4 space-y-3">
        <p className="text-sm font-medium">
          {tAdj('title')}
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            {tAdj('subtitle', { count: adjPaged?.total ?? 0 })}
          </span>
        </p>

        <DataTable
          columns={adjColumns}
          data={adjPaged?.data ?? []}
          hideSearch
          loading={adjLoading}
          maxHeight="320px"
          serverPagination={adjPaged ? {
            total: adjPaged.total,
            page: adjPaged.page,
            pageSize: adjPaged.pageSize,
            onPageChange: setAdjPage,
          } : undefined}
        />
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StockOutPage() {
  const t = useTranslations('admin.inventory.stockOut')
  const tInv = useTranslations('admin.inventory')
  const user = useAuthStore(s => s.user)

  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const effectiveBranchId = branchId ?? user?.branchId ?? null
  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(effectiveBranchId)

  const [prevBranch, setPrevBranch] = useState(effectiveBranchId)
  if (effectiveBranchId !== prevBranch) {
    setPrevBranch(effectiveBranchId)
    setCounterId(null)
    setPage(1)
    setSelectedItem(null)
  }

  const { data: paged, isLoading } = useInventory({
    branchId: effectiveBranchId ?? undefined,
    counterId: counterId ?? undefined,
    keyword: keyword.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const rows = (paged?.data ?? []).filter(item => item.quantity > 0)

  const statusLabels = useMemo<Record<InventoryStatus, string>>(() => ({
    TiepNhan:    tInv('statusTiepNhan'),
    DaDinhGia:   tInv('statusDaDinhGia'),
    TrenQuay:    tInv('statusTrenQuay'),
    ChuyenXuong: tInv('statusChuyenXuong'),
    DaBan:       tInv('statusDaBan'),
    DoiRa:       tInv('statusDoiRa'),
  }), [tInv])

  const columns = useMemo(() => createInventoryListColumns({
    labels: {
      productCode:  tInv('columns.productCode'),
      productName:  tInv('columns.productName'),
      purity:       tInv('columns.purity'),
      counter:      tInv('columns.counter'),
      source:       tInv('columns.source'),
      sourceQuan:   tInv('sourceQuan'),
      sourceNgoai:  tInv('sourceNgoai'),
      qty:          tInv('columns.qty'),
      weight:       tInv('columns.weight'),
      status:       tInv('columns.status'),
      statusLabels,
      updatedAt:    tInv('columns.updatedAt'),
    },
  }), [tInv, statusLabels])

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5 text-destructive" />
            <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tInv('list.subtitle', { count: paged?.total ?? 0 })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <ComboboxSelect
          value={effectiveBranchId}
          onChange={v => setBranchId(v)}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          placeholder={tInv('filterBranch')}
          className="w-44"
        />
        <ComboboxSelect
          value={counterId}
          onChange={v => setCounterId(v)}
          options={counters.map(c => ({ value: c.id, label: c.counterName }))}
          placeholder={tInv('filterCounter')}
          className="w-40"
          clearable
        />
        <Input
          value={keyword}
          onChange={e => { setKeyword(e.target.value); setPage(1) }}
          placeholder={tInv('filterKeyword')}
          className="w-56"
        />
      </div>

      {/* Bảng sản phẩm */}
      {isLoading ? (
        <TablePageSkeleton cols={9} rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          hideSearch
          onRowClick={item => setSelectedItem(prev => prev?.id === item.id ? null : item)}
          serverPagination={paged ? {
            total: paged.total,
            page: paged.page,
            pageSize: paged.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}

      {/* Detail panel inline — hiện khi chọn sản phẩm */}
      {selectedItem && (
        <StockOutDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Dialog tạo phiếu xuất */}
      <InventoryBulkAdjustDialog
        open={dialogOpen}
        direction="OUT"
        branchId={effectiveBranchId}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
