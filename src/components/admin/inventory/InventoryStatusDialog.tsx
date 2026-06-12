'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateInventoryStatus } from '@/hooks/useInventory'
import type { InventoryItem, InventoryStatus } from '@/types/inventory'

interface Props {
  item: InventoryItem | null
  onClose: () => void
}

const STATUS_VALUES: InventoryStatus[] = ['TiepNhan', 'DaDinhGia', 'TrenQuay', 'DaBan', 'ChuyenXuong']

export function InventoryStatusDialog({ item, onClose }: Props) {
  const t = useTranslations('admin.inventory')
  const tDialog = useTranslations('admin.inventory.statusDialog')

  const [status, setStatus] = useState<InventoryStatus>('TiepNhan')

  useEffect(() => {
    if (item) setStatus(item.trangThai)
  }, [item])

  const { mutate: updateStatus, isPending } = useUpdateInventoryStatus()

  if (!item) return null

  const unchanged = status === item.trangThai

  const handleSubmit = () => {
    if (unchanged) return
    updateStatus({ id: item.id, dto: { trangThai: status } }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!item} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tDialog('title')}</DialogTitle>
          <DialogDescription>
            {item.productName} · {t(`status${item.trangThai}`)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-1">
          <Field>
            <FieldLabel>{tDialog('newStatus')}</FieldLabel>
            <ComboboxSelect
              value={status}
              onChange={v => v && setStatus(v as InventoryStatus)}
              options={STATUS_VALUES.map(s => ({ value: s, label: t(`status${s}`) }))}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>{tDialog('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={unchanged || isPending}>
            {isPending && <Spinner className="mr-2" />}
            {tDialog('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
