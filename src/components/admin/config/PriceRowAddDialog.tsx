'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { useGoldPurities, useWeightUnits } from '@/hooks/useConfig'
import type { GoldPurity, WeightUnit } from '@/types/config'

type Category = 'Gold' | 'Silver'

interface Props {
  open: boolean
  /** Keys `${goldPurityId}:${weightUnitId}` đã có trong bảng giá — để loại trùng */
  existingKeys: Set<string>
  onAdd: (category: Category, purity: GoldPurity, unit: WeightUnit, buyPrice: string, sellPrice: string) => void
  onClose: () => void
}

export function PriceRowAddDialog({ open, existingKeys, onAdd, onClose }: Props) {
  const t = useTranslations('admin.config.prices')
  const { data: purities = [] } = useGoldPurities()
  const { data: units = [] } = useWeightUnits()

  const [category, setCategory]   = useState<'' | Category>('')
  const [purityId, setPurityId]   = useState('')
  const [unitId, setUnitId]       = useState('')
  const [buyPrice, setBuyPrice]   = useState('')
  const [sellPrice, setSellPrice] = useState('')

  function reset() {
    setCategory(''); setPurityId(''); setUnitId(''); setBuyPrice(''); setSellPrice('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  // Chọn Loại trước → lọc hàm lượng theo category
  const purityOptions = category ? purities.filter(p => p.category === category) : []
  // Đơn vị đã ghép với hàm lượng đang chọn → loại khỏi danh sách
  const unitOptions = units.filter(u => !purityId || !existingKeys.has(`${purityId}:${u.id}`))

  const isDuplicate = !!purityId && !!unitId && existingKeys.has(`${purityId}:${unitId}`)
  const canAdd = !!category && !!purityId && !!unitId && !isDuplicate

  function handleAdd() {
    if (!canAdd || !category) return
    const purity = purities.find(p => p.id === purityId)
    const unit = units.find(u => u.id === unitId)
    if (!purity || !unit) return
    onAdd(category, purity, unit, buyPrice, sellPrice)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={t('addDialogTitle')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
            <Button onClick={handleAdd} disabled={!canAdd}>{t('addConfirm')}</Button>
          </DialogFooter>
        }
      >
        <div className="space-y-3 py-1">
          <Field>
            <FieldLabel>{t('columns.category')}</FieldLabel>
            <Select
              value={category || undefined}
              onChange={v => { setCategory((v ?? '') as '' | Category); setPurityId(''); setUnitId('') }}
              placeholder={t('categoryPlaceholder')}
              options={[
                { value: 'Gold', label: t('categoryGold') },
                { value: 'Silver', label: t('categorySilver') },
              ]}
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('columns.purityCode')}</FieldLabel>
              <Select
                value={purityId || undefined}
                onChange={v => setPurityId(v ?? '')}
                placeholder={t('purityPlaceholder')}
                disabled={!category}
                options={purityOptions.map(p => ({ value: p.id, label: `${p.ma} (${p.hamLuong}%)` }))}
                showSearch
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                notFoundContent="Không tìm thấy"
                className="w-full"
                popupMatchSelectWidth={false}
              />
            </Field>
            <Field>
              <FieldLabel>{t('columns.unit')}</FieldLabel>
              <Select
                value={unitId || undefined}
                onChange={v => setUnitId(v ?? '')}
                placeholder={t('unitPlaceholder')}
                disabled={!category}
                options={unitOptions.map(u => ({ value: u.id, label: u.tenDonVi }))}
                showSearch
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                notFoundContent="Không tìm thấy"
                className="w-full"
                popupMatchSelectWidth={false}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('columns.buy')}</FieldLabel>
              <Input type="number" min="0" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="h-9 text-right" />
            </Field>
            <Field>
              <FieldLabel>{t('columns.sell')}</FieldLabel>
              <Input type="number" min="0" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="h-9 text-right" />
            </Field>
          </div>

          {isDuplicate && (
            <p className="text-xs text-destructive">{t('duplicateHint')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
