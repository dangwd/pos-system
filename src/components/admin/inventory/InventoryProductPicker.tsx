'use client'

import { useTranslations } from 'next-intl'
import { Form } from 'antd'
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
    <Form layout="vertical">
      <Form.Item label={t('selectProduct')} style={{ marginBottom: 0 }}>
        <ComboboxSelect
          value={value}
          onChange={onChange}
          options={items.map(i => ({ value: i.id, label: `${i.productName} · ${i.quantity}` }))}
          placeholder={t('selectPlaceholder')}
        />
      </Form.Item>
    </Form>
  )
}
