'use client'

import { useTranslations } from 'next-intl'
import { Spinner } from '@/components/ui/spinner'
import { Empty, EmptyTitle } from '@/components/ui/empty'
import { ClipboardList } from 'lucide-react'
import { useInventoryAdjustments } from '@/hooks/useInventory'

interface Props {
  branchId: string | null
  branchName: string
}

export function InventoryActivityLog({ branchId, branchName }: Props) {
  const t = useTranslations('admin.inventory.activityLog')

  const { data: logsPage, isLoading } = useInventoryAdjustments(
    branchId ? { branchId } : undefined,
    !!branchId,
  )
  const logs = logsPage?.data ?? []

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 border-b pb-2.5">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">{t('title')}</h3>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : logs.length === 0 ? (
        <Empty className="border-0 py-8">
          <EmptyTitle>{t('empty')}</EmptyTitle>
        </Empty>
      ) : (
        <ul className="mt-3 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
          {logs.map(log => {
            const isIn = log.direction === 'IN'
            const firstProduct = log.lines[0]?.productName ?? '—'
            const productLabel = log.lines.length > 1 ? `${firstProduct} +${log.lines.length - 1}` : firstProduct
            return (
              <li key={log.id} className="rounded-lg border bg-muted/20 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                      {log.adjustmentCode}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">({branchName})</span>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(log.createdAt).toLocaleTimeString('lo-LA')}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium leading-snug">
                  {productLabel} —{' '}
                  <span className={isIn ? 'text-primary' : 'text-destructive'}>
                    {isIn ? t('in') : t('out')} {log.totalQuantity}
                  </span>
                </p>
                {log.reason && (
                  <p className="mt-0.5 text-xs italic text-muted-foreground leading-snug">“{log.reason}”</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
