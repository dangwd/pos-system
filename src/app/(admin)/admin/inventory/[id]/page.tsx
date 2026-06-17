'use client'

import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  VerticalAlignBottomOutlined,
  ArrowLeftOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/shared/DataTable'
import { InventoryStatusDialog } from '@/components/admin/inventory/InventoryStatusDialog'
import { createAdjustmentsPageColumns } from '@/components/admin/columns/inventory-adjustments-page-columns'
import { getStatusTransition } from '@/components/admin/columns/inventory-list-columns'
import { useInventoryItem, useInventoryAdjustments } from '@/hooks/useInventory'
import { useAuthStore } from '@/stores/auth.store'
import type { InventoryStatus } from '@/types/inventory'

const STATUS_STYLE: Record<InventoryStatus, string> = {
  TiepNhan:    'bg-muted text-muted-foreground',
  DaDinhGia:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TrenQuay:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ChuyenXuong: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DaBan:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DoiRa:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const PAGE_SIZE = 20

export default function InventoryItemDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const t = useTranslations('admin.inventory')
  const tDetail = useTranslations('admin.inventory.detail')
  const tAdj = useTranslations('admin.inventory.adjustments')

  const user = useAuthStore(s => s.user)
  const canManage = !!user?.permissions.includes('INVENTORY_MANAGE')

  const [statusTarget, setStatusTarget] = useState<InventoryStatus | null>(null)

  const { data: item, isLoading } = useInventoryItem(id ?? null)
  // BE không lọc phiếu theo từng mục kho → lấy lịch sử theo chi nhánh rồi lọc client-side
  // các phiếu có dòng chứa item này. Lấy trang lớn để giảm sót (best-effort theo giới hạn BE).
  const { data: adjPaged, isLoading: adjLoading } = useInventoryAdjustments(
    item ? { branchId: item.branchId, page: 1, pageSize: 100 } : undefined,
    !!item,
  )
  const adjRows = useMemo(
    () => (adjPaged?.data ?? []).filter(a => a.lines.some(l => l.inventoryItemId === id)),
    [adjPaged, id],
  )

  const statusLabels = useMemo<Record<InventoryStatus, string>>(() => ({
    TiepNhan:    t('statusTiepNhan'),
    DaDinhGia:   t('statusDaDinhGia'),
    TrenQuay:    t('statusTrenQuay'),
    ChuyenXuong: t('statusChuyenXuong'),
    DaBan:       t('statusDaBan'),
    DoiRa:       t('statusDoiRa'),
  }), [t])

  const transition = item ? getStatusTransition(item.trangThai, {
    pricing:        t('actions.pricing'),
    putOnDisplay:   t('actions.putOnDisplay'),
    moveToWorkshop: t('actions.moveToWorkshop'),
  }) : null

  const adjColumns = useMemo(() => createAdjustmentsPageColumns({
    code:        tAdj('columns.code'),
    direction:   tAdj('columns.direction'),
    dirIn:       tAdj('dirIn'),
    dirOut:      tAdj('dirOut'),
    product:     tAdj('columns.product'),
    counter:     tAdj('columns.counter'),
    qty:         tAdj('columns.qty'),
    weight:      tAdj('columns.weight'),
    nguonGocLo:  tAdj('columns.nguonGocLo'),
    documentRef: tAdj('columns.documentRef'),
    supplier:    tAdj('columns.supplier'),
    value:       tAdj('columns.value'),
    reason:      tAdj('columns.reason'),
    createdAt:   tAdj('columns.createdAt'),
    cash:        tAdj('cash'),
    bank:        tAdj('bank'),
    na:          tAdj('na'),
  }), [tAdj])

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => router.push('/admin/inventory/stock-out')}>
          <ArrowLeftOutlined className="h-3.5 w-3.5" />
          {tDetail('back')}
        </Button>
        <p className="text-muted-foreground">{tDetail('notFound')}</p>
      </div>
    )
  }

  const perPieceGram = item.quantity > 0 ? item.weightGram / item.quantity : 0

  return (
    <div className="p-6 space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground -ml-2"
        onClick={() => router.push('/admin/inventory/stock-out')}
      >
        <ArrowLeftOutlined className="h-3.5 w-3.5" />
        {tDetail('back')}
      </Button>

      {/* Item info card */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Left: product info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{item.productCode}</span>
              {item.purity && (
                <Badge variant="secondary" className="text-[10px]">{item.purity}</Badge>
              )}
              <Badge variant="secondary" className={`text-[10px] ${STATUS_STYLE[item.trangThai]}`}>
                {statusLabels[item.trangThai]}
              </Badge>
            </div>
            <h1 className="text-xl font-bold">{item.productName}</h1>
            <p className="text-sm text-muted-foreground">{item.counterName}</p>
          </div>

          {/* Right: stock numbers */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">{item.quantity}</p>
              <p className="text-xs text-muted-foreground">{tDetail('qty')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums">
                {item.weightGram.toLocaleString('lo-LA', { maximumFractionDigits: 2 })}
                <span className="text-sm font-normal ml-0.5">g</span>
              </p>
              <p className="text-xs text-muted-foreground">{tDetail('totalWeight')}</p>
            </div>
            {perPieceGram > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums">
                  {perPieceGram.toLocaleString('lo-LA', { maximumFractionDigits: 3 })}
                  <span className="text-sm font-normal ml-0.5">g</span>
                </p>
                <p className="text-xs text-muted-foreground">{tDetail('perPiece')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => router.push(`/admin/inventory/stock-in?id=${item.id}`)}
            >
              <VerticalAlignBottomOutlined className="h-4 w-4" />
              {tDetail('stockIn')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => router.push(`/admin/inventory/stock-out?id=${item.id}`)}
            >
              <VerticalAlignTopOutlined className="h-4 w-4" />
              {tDetail('stockOut')}
            </Button>
            {transition && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusTarget(transition.targetStatus)}
              >
                {transition.buttonLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Adjustment history */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{tDetail('historyTitle')}</h2>
          <p className="text-sm text-muted-foreground">
            {tAdj('subtitle', { count: adjRows.length })}
          </p>
        </div>
        <DataTable
          columns={adjColumns}
          data={adjRows}
          hideSearch
          loading={adjLoading}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Status transition dialog */}
      <InventoryStatusDialog
        item={statusTarget ? item : null}
        targetStatus={statusTarget}
        onClose={() => setStatusTarget(null)}
      />
    </div>
  )
}
