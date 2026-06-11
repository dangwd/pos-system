'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { DataTable } from '@/components/shared/DataTable'
import { createInventoryColumns } from '@/components/admin/columns/inventory-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { InventorySummaryCards } from '@/components/admin/inventory/InventorySummaryCards'
import { useInventory, useInventoryValuation } from '@/hooks/useInventory'
import { lakToForeign, findRate } from '@/lib/inventory-valuation'
import type { InventoryItem } from '@/types/inventory'

const PAGE_SIZE = 20

interface Props {
  branchId: string | null
  branchName: string
  /** Bỏ trống ⇒ ẩn cột "Sửa" (không có quyền điều chỉnh kho). */
  onEditItem?: (item: InventoryItem) => void
}

export function InventoryCatalog({ branchId, branchName, onEditItem }: Props) {
  const t = useTranslations('admin.inventory')

  const [page, setPage] = useState(1)
  // Reset trang khi đổi chi nhánh (adjust state during render — không dùng effect).
  const [prevBranch, setPrevBranch] = useState(branchId)
  if (branchId !== prevBranch) {
    setPrevBranch(branchId)
    setPage(1)
  }

  // Thẻ summary cần TẤT CẢ mục (array mode) — chưa có endpoint tổng hợp ở backend.
  const { totals, valuate, rates } = useInventoryValuation(branchId)
  // Bảng dùng phân trang server theo Quy ước Phân trang (?page=N, pageSize=20).
  const { data: paged, isLoading } = useInventory({ branchId: branchId ?? undefined, page, pageSize: PAGE_SIZE })
  const rows = paged?.data ?? []

  const thbRate = findRate(rates, 'THB')
  const usdRate = findRate(rates, 'USD')
  const toThb = (lak: number) => lakToForeign(lak, thbRate)
  const totalAssetUsd = lakToForeign(totals.totalAssetLak, usdRate)

  const columns = useMemo(() => createInventoryColumns({
    labels: {
      product:     t('catalog.columns.product'),
      priceLink:   t('catalog.columns.priceLink'),
      stdWeight:   t('catalog.columns.stdWeight'),
      extraCost:   t('catalog.columns.extraCost'),
      retailPrice: t('catalog.columns.retailPrice'),
      stock:       t('catalog.columns.stock'),
      actions:     t('catalog.columns.actions'),
      edit:        t('catalog.edit'),
      pieces:      t('catalog.pieces'),
      lot:         t('catalog.lot'),
      labor:       t('catalog.labor'),
      stone:       t('catalog.stone'),
      na:          t('catalog.na'),
    },
    valuate,
    toThb,
    onEdit: onEditItem,
  }), [t, valuate, thbRate, onEditItem]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold">{t('catalog.title', { branch: branchName })}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{t('catalog.subtitle')}</p>
      </div>

      <InventorySummaryCards totals={totals} totalAssetUsd={totalAssetUsd} />

      {isLoading ? (
        <TablePageSkeleton cols={7} rows={6} />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          hideSearch
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
