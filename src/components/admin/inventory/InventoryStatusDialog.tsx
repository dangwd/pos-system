'use client'

import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateInventoryStatus } from '@/hooks/useInventory'
import type { InventoryItem, InventoryStatus } from '@/types/inventory'

interface Props {
  item: InventoryItem | null
  targetStatus: InventoryStatus | null
  onClose: () => void
}

const STATUS_STYLE: Record<InventoryStatus, string> = {
  TiepNhan:    'bg-muted text-muted-foreground',
  DaDinhGia:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TrenQuay:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  ChuyenXuong: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DaBan:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DoiRa:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export function InventoryStatusDialog({ item, targetStatus, onClose }: Props) {
  const t = useTranslations('admin.inventory')
  const tDialog = useTranslations('admin.inventory.confirmStatusDialog')
  const { mutate: updateStatus, isPending } = useUpdateInventoryStatus()

  if (!item || !targetStatus) return null

  const statusLabel = (s: InventoryStatus) => t(`status${s}` as Parameters<typeof t>[0])

  const CONFIRM_LABELS: Partial<Record<InventoryStatus, string>> = {
    DaDinhGia:   tDialog('confirmToDaDinhGia'),
    TrenQuay:    tDialog('confirmToTrenQuay'),
    ChuyenXuong: tDialog('confirmToChuyenXuong'),
  }
  const confirmLabel = CONFIRM_LABELS[targetStatus] ?? tDialog('confirm')

  function handleConfirm() {
    updateStatus(
      { id: item!.id, dto: { trangThai: targetStatus! } },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!item && !!targetStatus} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        title={tDialog('title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{tDialog('cancel')}</Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        }
      >
        <div className="space-y-3 py-1">
          {/* Product info */}
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <p className="font-medium">{item.productName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.counterName}</p>
          </div>

          {/* Transition arrow */}
          <div className="flex items-center justify-center gap-3">
            <Badge variant="secondary" className={`text-xs ${STATUS_STYLE[item.trangThai]}`}>
              {statusLabel(item.trangThai)}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <Badge variant="secondary" className={`text-xs ${STATUS_STYLE[targetStatus]}`}>
              {statusLabel(targetStatus)}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
