'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { ArrowLeft, Info, PackagePlus } from 'lucide-react'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useConfigPrices } from '@/hooks/useConfig'
import type { PriceItem } from '@/types/config'
import type { ProductCategory } from '@/types/product'

interface Props {
  onBack: () => void
}

const EMPTY = { productName: '', productCode: '', categoryId: '', priceKey: '' }

// Tên đơn vị thân thiện từ mã (price item chỉ có weightUnitCode, không có tên hiển thị).
const UNIT_NAMES: Record<string, string> = { chi: 'Chỉ', luong: 'Lượng', cay: 'Cây', bath: 'Bath', gram: 'Gram', oz: 'Oz' }
const unitName = (code: string) => UNIT_NAMES[code] ?? code

// Khóa duy nhất cho 1 dòng giá (hàm lượng × đơn vị) — price item không có id riêng.
const keyOf = (it: PriceItem) => `${it.goldPurityId}__${it.weightUnitId}`

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
  const { data: priceConfig } = useConfigPrices()
  const { mutate: create, isPending } = useCreateProduct()

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))
  // Đổi phân nhóm → reset mã giá (danh sách hàm lượng đổi theo kim loại).
  const changeCategory = (v: string | null) => setForm(f => ({ ...f, categoryId: v ?? '', priceKey: '' }))

  const priceItems = priceConfig?.items ?? []
  const selectedCat = categories.find(c => c.id === form.categoryId)
  const metal = selectedCat ? categoryMetal(selectedCat) : null
  // Cascade "ăn theo": map chắc chắn → lọc theo kim loại; không chắc → hiện tất cả.
  const priceOptions = metal ? priceItems.filter(it => it.category === metal) : priceItems
  // Chọn 1 dòng giá ⇒ suy ra goldPurityId + weightUnitId (đi cùng nhau ⇒ hết 422).
  const selectedPrice = priceItems.find(it => keyOf(it) === form.priceKey)

  const disabled = !form.productName || !form.productCode || !form.categoryId

  const handleSubmit = () => {
    if (disabled) return
    create(
      {
        productCode: form.productCode.trim(),
        productName: form.productName.trim(),
        productCategoryId: form.categoryId,
        goldPurityId: selectedPrice?.goldPurityId ?? null,
        weightUnitId: selectedPrice?.weightUnitId,
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
          <ArrowLeft className="h-3.5 w-3.5" />
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

      <Field>
        <FieldLabel>{t('priceLink')}</FieldLabel>
        <ComboboxSelect
          value={form.priceKey || null}
          onChange={v => set('priceKey', v ?? '')}
          options={priceOptions.map(it => ({
            value: keyOf(it),
            label: `${it.purityCode} · ${unitName(it.weightUnitCode)} · ${it.sellPrice.toLocaleString('lo-LA')} ₭`,
          }))}
          placeholder={t('priceLinkPlaceholder')}
          clearable
        />
        <p className="text-[10px] text-muted-foreground">{t('priceLinkHint')}</p>
      </Field>

      <p className="flex items-start gap-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
        {t('stockNote')}
      </p>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onBack} disabled={isPending}>{t('cancel')}</Button>
        <Button className="gap-1.5" onClick={handleSubmit} disabled={disabled || isPending}>
          {isPending ? <Spinner /> : <PackagePlus className="h-4 w-4" />}
          {t('submit')}
        </Button>
      </div>
    </div>
  )
}
