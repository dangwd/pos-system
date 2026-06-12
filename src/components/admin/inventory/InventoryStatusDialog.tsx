'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogFooter,
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

// Keyed inner component — remounts when `item` changes so status state
// always initializes from the current entity without a useEffect.
// submitRef is populated so the outer footer button can trigger submission.
function StatusFormBody({
  item,
  submitRef,
}: {
  item: InventoryItem
  submitRef: React.MutableRefObject<(() => InventoryStatus | null)>
}) {
  const t       = useTranslations('admin.inventory')
  const tDialog = useTranslations('admin.inventory.statusDialog')

  const [status, setStatus] = useState<InventoryStatus>(() => item.trangThai)

  submitRef.current = () => (status !== item.trangThai ? status : null)

  return (
    <div className="py-1">
      <p className="text-sm text-muted-foreground mb-3">
        {item.productName} · {t(`status${item.trangThai}`)}
      </p>
      <Field>
        <FieldLabel>{tDialog('newStatus')}</FieldLabel>
        <ComboboxSelect
          value={status}
          onChange={v => v && setStatus(v as InventoryStatus)}
          options={STATUS_VALUES.map(s => ({ value: s, label: t(`status${s}`) }))}
        />
      </Field>
    </div>
  )
}

export function InventoryStatusDialog({ item, onClose }: Props) {
  const tDialog = useTranslations('admin.inventory.statusDialog')
  const { mutate: updateStatus, isPending } = useUpdateInventoryStatus()
  const submitRef = useRef<() => InventoryStatus | null>(() => null)

  function handleSubmit() {
    if (!item) return
    const status = submitRef.current()
    if (!status) return
    updateStatus({ id: item.id, dto: { trangThai: status } }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!item} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={tDialog('title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{tDialog('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {tDialog('submit')}
            </Button>
          </DialogFooter>
        }
      >
        {item && (
          <StatusFormBody
            key={item.id}
            item={item}
            submitRef={submitRef}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
