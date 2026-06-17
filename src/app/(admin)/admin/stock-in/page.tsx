'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PlusOutlined } from '@ant-design/icons'
import { Button } from '@/components/ui/button'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { createAdjustmentColumns } from '@/components/admin/columns/inventory-adjustment-columns'
import { InventoryBulkAdjustDialog } from '@/components/admin/inventory/InventoryBulkAdjustDialog'
import { useBranches } from '@/hooks/useBranches'
import { useInventoryAdjustments } from '@/hooks/useInventory'
import { useAuthStore } from '@/stores/auth.store'

// API /api/inventory/adjustments không lọc theo direction ⇒ lấy gần đây rồi lọc client.
const FETCH_SIZE = 100

export default function StockInPage() {
  const t = useTranslations('admin.inventory.stockIn')
  const tInv = useTranslations('admin.inventory')
  const user = useAuthStore(s => s.user)
  const canManage = !!user?.permissions.includes('INVENTORY_MANAGE')

  const [branchId, setBranchId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { data: branches = [] } = useBranches()
  const effectiveBranchId = branchId ?? user?.branchId ?? branches[0]?.id ?? null

  const { data: page, isLoading } = useInventoryAdjustments(
    effectiveBranchId ? { branchId: effectiveBranchId, page: 1, pageSize: FETCH_SIZE } : undefined,
    !!effectiveBranchId,
  )
  const rows = useMemo(() => (page?.data ?? []).filter(a => a.direction === 'IN'), [page])

  const columns = useMemo(() => createAdjustmentColumns({
    variant: 'IN',
    labels: {
      code: t('columns.code'),
      product: t('columns.product'),
      quantity: t('columns.quantity'),
      payment: t('columns.payment'),
      value: t('columns.value'),
      reason: t('columns.reason'),
      date: t('columns.date'),
      cash: t('cash'),
      bank: t('bank'),
    },
  }), [t])

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('pageSubtitle', { count: rows.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <ComboboxSelect
            value={effectiveBranchId}
            onChange={setBranchId}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            placeholder={tInv('filterBranch')}
            className="w-48"
          />
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <PlusOutlined className="h-4 w-4" />
              {t('addButton')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={6} rows={8} />
      ) : (
        <DataTable columns={columns} data={rows} hideSearch pageSize={20} />
      )}

      <InventoryBulkAdjustDialog open={createOpen} direction="IN" branchId={effectiveBranchId} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
