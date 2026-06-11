'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Info, RefreshCcw } from 'lucide-react'
import { InventoryProductPicker } from '@/components/admin/inventory/InventoryProductPicker'
import { useInventoryList, useAdjustInventory } from '@/hooks/useInventory'
import type { AdjustDirection, InventoryItem } from '@/types/inventory'

interface Props {
  branchId: string | null
  selectedItemId: string | null
  onSelectItem: (id: string | null) => void
  onChangeStatus: (item: InventoryItem) => void
}

export function InventoryAdjustPanel({ branchId, selectedItemId, onSelectItem, onChangeStatus }: Props) {
  const t = useTranslations('admin.inventory.adjustPanel')

  const [direction, setDirection] = useState<AdjustDirection>('IN')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')

  const { data: items = [] } = useInventoryList({ branchId: branchId ?? undefined }, !!branchId)
  const { mutate: adjust, isPending } = useAdjustInventory()

  const selected = items.find(i => i.id === selectedItemId) ?? null

  const qtyNum = parseInt(quantity, 10)
  const invalidQty = isNaN(qtyNum) || qtyNum <= 0
  const exceedsStock = direction === 'OUT' && selected != null && !invalidQty && qtyNum > selected.quantity
  const disabled = !selected || invalidQty || !reason.trim() || exceedsStock

  const handleSubmit = () => {
    if (disabled || !selected) return
    adjust(
      { id: selected.id, dto: { direction, quantity: qtyNum, reason: reason.trim() } },
      { onSuccess: () => { setQuantity(''); setReason('') } },
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 border-b pb-2.5">
        <Boxes className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">{t('title')}</h3>
      </div>

      <InventoryProductPicker branchId={branchId} value={selectedItemId} onChange={onSelectItem} />
      {selected && (
        <button
          type="button"
          onClick={() => onChangeStatus(selected)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <RefreshCcw className="h-3 w-3" />
          {t('changeStatus')}
        </button>
      )}

      {/* Direction toggle */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('direction')}</label>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant={direction === 'IN' ? 'default' : 'outline'} className="gap-1.5" onClick={() => setDirection('IN')}>
            <ArrowDownToLine className="h-4 w-4" />
            {t('directionIn')}
          </Button>
          <Button type="button" variant={direction === 'OUT' ? 'default' : 'outline'} className="gap-1.5" onClick={() => setDirection('OUT')}>
            <ArrowUpFromLine className="h-4 w-4" />
            {t('directionOut')}
          </Button>
        </div>
      </div>

      {/* Quantity */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">
          {t('quantity')}{selected ? ` · ${t('currentStock', { qty: selected.quantity })}` : ''}
        </label>
        <Input type="number" min={1} step={1} className="h-9" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
        {exceedsStock && selected && (
          <p className="text-xs text-destructive">{t('exceedsStock', { qty: selected.quantity })}</p>
        )}
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">{t('reason')}</label>
        <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={t('reasonPlaceholder')} rows={2} />
      </div>

      {/* Audit note */}
      <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
        <span>{t('note')}</span>
      </div>

      <Button className="w-full gap-1.5" onClick={handleSubmit} disabled={disabled || isPending}>
        {isPending ? <Spinner /> : <Boxes className="h-4 w-4" />}
        {t('submit')}
      </Button>
    </div>
  )
}
