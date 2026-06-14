'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { createAdjustmentsPageColumns } from '@/components/admin/columns/inventory-adjustments-page-columns'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useInventoryAdjustments } from '@/hooks/useInventory'
import { useAuthStore } from '@/stores/auth.store'
import type { AdjustDirection } from '@/types/inventory'

const PAGE_SIZE = 20

export default function InventoryAdjustmentsPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.inventory.adjustments')
  const router = useRouter()
  const user = useAuthStore(s => s.user)

  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [direction, setDirection] = useState<AdjustDirection | null>(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const effectiveBranchId = branchId ?? user?.branchId ?? null
  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(effectiveBranchId)

  const [prevBranch, setPrevBranch] = useState(effectiveBranchId)
  if (effectiveBranchId !== prevBranch) {
    setPrevBranch(effectiveBranchId)
    setCounterId(null)
    setPage(1)
  }

  const { data: paged, isLoading } = useInventoryAdjustments(
    {
      branchId: effectiveBranchId ?? undefined,
      counterId: counterId ?? undefined,
      direction: direction ?? undefined,
      keyword: keyword.trim() || undefined,
      page,
      pageSize: PAGE_SIZE,
    },
    !!effectiveBranchId,
  )
  const rows = paged?.data ?? []

  const columns = useMemo(() => createAdjustmentsPageColumns({
    code:        t('columns.code'),
    direction:   t('columns.direction'),
    dirIn:       t('dirIn'),
    dirOut:      t('dirOut'),
    product:     t('columns.product'),
    counter:     t('columns.counter'),
    qty:         t('columns.qty'),
    weight:      t('columns.weight'),
    nguonGocLo:  t('columns.nguonGocLo'),
    documentRef: t('columns.documentRef'),
    supplier:    t('columns.supplier'),
    value:       t('columns.value'),
    reason:      t('columns.reason'),
    createdAt:   t('columns.createdAt'),
    cash:        t('cash'),
    bank:        t('bank'),
    na:          t('na'),
  }), [t])


  if (!hasPermission('INVENTORY_MANAGE')) return <ForbiddenPage />
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={() => router.push('/admin/inventory')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('backToList')}
            </Button>
          </div>
          <h1 className="text-2xl font-bold mt-1">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('subtitle', { count: paged?.total ?? 0 })}
          </p>
        </div>
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
          value={direction}
          onChange={v => setDirection((v as AdjustDirection) ?? null)}
          options={[
            { value: 'IN',  label: t('dirIn') },
            { value: 'OUT', label: t('dirOut') },
          ]}
          placeholder={t('filterDirection')}
          className="w-36"
          clearable
        />
        <Input
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder={t('filterKeyword')}
          className="w-56"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TablePageSkeleton cols={12} rows={8} />
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
