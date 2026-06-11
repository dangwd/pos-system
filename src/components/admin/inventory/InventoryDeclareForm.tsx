'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { ComboboxSelect } from '@/components/shared/ComboboxSelect'
import { ArrowLeft, Info, PackagePlus } from 'lucide-react'
import { InventoryPricePreview } from '@/components/admin/inventory/InventoryPricePreview'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useGoldPurities, useConfigPrices, useExchangeRates } from '@/hooks/useConfig'
import {
  GRAM_PER_CHI, estimateProductSellPrice, findPriceItem, lakToForeign, findRate,
} from '@/lib/inventory-valuation'

interface Props {
  onBack: () => void
}

const EMPTY = { productName: '', productCode: '', categoryId: '', purityId: '', stdChi: '1', labor: '0', stone: '0' }

export function InventoryDeclareForm({ onBack }: Props) {
  const t = useTranslations('admin.inventory.declare')
  const [form, setForm] = useState(EMPTY)

  const { data: categories = [] } = useCategories()
  const { data: purities = [] } = useGoldPurities()
  const { data: priceConfig } = useConfigPrices()
  const { data: rates } = useExchangeRates()
  const { mutate: create, isPending } = useCreateProduct()

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const purity = purities.find(p => p.id === form.purityId)
  const sellPerChi = purity ? findPriceItem(priceConfig, purity.ma, 'chi')?.sellPrice ?? 0 : 0
  const chi = parseFloat(form.stdChi) || 0
  const estimate = estimateProductSellPrice(chi, sellPerChi, parseInt(form.labor, 10) || 0, parseInt(form.stone, 10) || 0)
  const thb = lakToForeign(estimate.total, findRate(rates, 'THB'))
  const usd = lakToForeign(estimate.total, findRate(rates, 'USD'))

  const disabled = !form.productName || !form.productCode || !form.categoryId || chi <= 0

  const handleSubmit = () => {
    if (disabled) return
    create(
      {
        productCode: form.productCode.trim(),
        productName: form.productName.trim(),
        productCategoryId: form.categoryId,
        goldPurityId: form.purityId || null,
        weightGram: chi * GRAM_PER_CHI,
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
            onChange={v => v && set('categoryId', v)}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder={t('categoryPlaceholder')}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>{t('priceLink')}</FieldLabel>
          <ComboboxSelect
            value={form.purityId || null}
            onChange={v => set('purityId', v ?? '')}
            options={purities.map(p => ({ value: p.id, label: `${p.ma} · ${p.hamLuong}%` }))}
            placeholder={t('priceLinkPlaceholder')}
            clearable
          />
        </Field>
        <Field>
          <FieldLabel>{t('stdWeight')}</FieldLabel>
          <Input type="number" min={0} step="0.01" value={form.stdChi} onChange={e => set('stdChi', e.target.value)} />
          <p className="text-[10px] text-muted-foreground">{t('weightEquiv', { gram: (chi * GRAM_PER_CHI).toLocaleString('lo-LA', { maximumFractionDigits: 2 }) })}</p>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>{t('labor')}</FieldLabel>
          <Input type="number" min={0} step={1000} value={form.labor} onChange={e => set('labor', e.target.value)} />
        </Field>
        <Field>
          <FieldLabel>{t('stone')}</FieldLabel>
          <Input type="number" min={0} step={1000} value={form.stone} onChange={e => set('stone', e.target.value)} />
        </Field>
      </div>

      <InventoryPricePreview estimate={estimate} thb={thb} usd={usd} />

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
