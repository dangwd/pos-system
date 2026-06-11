'use client'

import { useTranslations } from 'next-intl'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { useInventoryList } from '@/hooks/useInventory'

interface Props {
  branchId: string | null
  value: string | null
  onChange: (id: string | null) => void
}

export function InventoryProductPicker({ branchId, value, onChange }: Props) {
  const t = useTranslations('admin.inventory.adjustPanel')
  const { data: items = [] } = useInventoryList({ branchId: branchId ?? undefined }, !!branchId)

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-muted-foreground">{t('selectProduct')}</label>
      <ComboboxSelect
        value={value}
        onChange={onChange}
        options={items.map(i => ({ value: i.id, label: `${i.productName} · ${i.quantity}` }))}
        placeholder={t('selectPlaceholder')}
      />
    </div>
  )
}
