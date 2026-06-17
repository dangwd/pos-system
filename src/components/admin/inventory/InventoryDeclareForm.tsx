'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { ArrowLeftOutlined, InfoCircleOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useActivePriceConfig } from '@/hooks/useConfig'
import type { ProductCategory } from '@/types/product'

interface Props {
  onBack: () => void
}

const EMPTY = { productName: '', productCode: '', categoryId: '', goldPurityId: '', weightUnitId: '' }

// Tên đơn vị thân thiện từ mã (price item chỉ có weightUnitCode, không có tên hiển thị).
const UNIT_NAMES: Record<string, string> = { chi: 'Chỉ', luong: 'Lượng', cay: 'Cây', bath: 'Bath', gram: 'Gram', oz: 'Oz' }
const unitName = (code: string) => UNIT_NAMES[code] ?? code

function uniqueBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const x of arr) { const k = key(x); if (!seen.has(k)) { seen.add(k); out.push(x) } }
  return out
}

// Map phân nhóm → kim loại để lọc "ăn theo" (best-effort: backend chưa có field nối
// ProductCategory ↔ Gold/Silver). Bỏ dấu để khớp ổn định; không nhận diện được ⇒ hiện tất cả.
function categoryMetal(cat: ProductCategory): 'Gold' | 'Silver' | null {
  const s = `${cat.code} ${cat.name}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (s.includes('bac') || s.includes('silver')) return 'Silver'
  if (s.includes('vang') || s.includes('gold')) return 'Gold'
  return null
}

export function InventoryDeclareForm({ onBack }: Props) {
  const t = useTranslations('admin.inventory.declare')
  const [form, setForm] = useState(EMPTY)

  const { data: categories = [] } = useCategories()
  const { priceConfig } = useActivePriceConfig()
  const { mutate: create, isPending } = useCreateProduct()

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  // Đổi phân nhóm → reset hàm lượng + đơn vị (danh sách đổi theo kim loại).
  const changeCategory = (v: string | null) => setForm(f => ({ ...f, categoryId: v ?? '', goldPurityId: '', weightUnitId: '' }))
  // Đổi hàm lượng → reset đơn vị (đơn vị "ăn theo" hàm lượng).
  const changePurity = (v: string | null) => setForm(f => ({ ...f, goldPurityId: v ?? '', weightUnitId: '' }))

  const priceItems = priceConfig?.items ?? []
  const selectedCat = categories.find(c => c.id === form.categoryId)
  const metal = selectedCat ? categoryMetal(selectedCat) : null
  // Cascade theo kim loại: map chắc chắn → lọc; không chắc → hiện tất cả.
  const scoped = metal ? priceItems.filter(it => it.category === metal) : priceItems

  // Hàm lượng: gom theo goldPurityId (1 hàm lượng có thể có nhiều đơn vị).
  const purityOptions = uniqueBy(scoped, it => it.goldPurityId)
    .map(it => ({ value: it.goldPurityId, label: `${it.purityCode} · ${it.hamLuong}%` }))
  // Đơn vị: chỉ các đơn vị CÓ GIÁ cho hàm lượng đã chọn ("ăn theo").
  const unitOptions = uniqueBy(scoped.filter(it => it.goldPurityId === form.goldPurityId), it => it.weightUnitId)
    .map(it => ({ value: it.weightUnitId, label: `${unitName(it.weightUnitCode)} · ${it.sellPrice.toLocaleString('lo-LA')} ₭` }))

  // 422: đã chọn hàm lượng thì BẮT BUỘC chọn đơn vị (gửi kèm goldPurityId + weightUnitId).
  const needUnit = !!form.goldPurityId && !form.weightUnitId
  const disabled = !form.productName || !form.productCode || !form.categoryId || needUnit

  const handleSubmit = () => {
    if (disabled) return
    create(
      {
        productCode: form.productCode.trim(),
        productName: form.productName.trim(),
        productCategoryId: form.categoryId,
        goldPurityId: form.goldPurityId || null,
        weightUnitId: form.weightUnitId || undefined,
        // Sản phẩm mới luôn tạo với tồn = 0; trọng lượng thực phát sinh khi nhập kho.
        weightGram: 0,
        productType: 'NguyenKhoi',
      },
      { onSuccess: () => setForm(EMPTY) },
    )
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold">{t('title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeftOutlined className="h-3.5 w-3.5" />
          {t('back')}
        </button>
      </div>

      <Field>
        <FieldLabel>{t('name')}</FieldLabel>
        <Input value={form.productName} onChange={e => set('productName', e.target.value)} placeholder={t('namePlaceholder')} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>{t('sku')}</FieldLabel>
          <Input value={form.productCode} onChange={e => set('productCode', e.target.value)} placeholder={t('skuPlaceholder')} className="font-mono uppercase" />
        </Field>
        <Field>
          <FieldLabel>{t('category')}</FieldLabel>
          <ComboboxSelect
            value={form.categoryId || null}
            onChange={changeCategory}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder={t('categoryPlaceholder')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>{t('priceLink')}</FieldLabel>
          <ComboboxSelect
            value={form.goldPurityId || null}
            onChange={changePurity}
            options={purityOptions}
            placeholder={t('priceLinkPlaceholder')}
            clearable
          />
          <p className="text-[10px] text-muted-foreground">{t('priceLinkHint')}</p>
        </Field>
        <Field>
          <FieldLabel>{t('unit')}</FieldLabel>
          <ComboboxSelect
            value={form.weightUnitId || null}
            onChange={v => set('weightUnitId', v ?? '')}
            options={unitOptions}
            placeholder={t('unitPlaceholder')}
            clearable
          />
          {needUnit && <p className="text-[10px] text-destructive">{t('unitRequired')}</p>}
        </Field>
      </div>

      <p className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
        <InfoCircleOutlined className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
        {t('stockNote')}
      </p>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>{t('cancel')}</Button>
        <Button className="gap-1.5" onClick={handleSubmit} disabled={disabled || isPending}>
          {isPending ? <Spinner /> : <PlusSquareOutlined className="h-4 w-4" />}
          {t('submit')}
        </Button>
      </div>
    </div>
  )
}
