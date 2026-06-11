'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useGoldPurities } from '@/hooks/useConfig'
import type { ProductType } from '@/types/product'

const PRODUCT_TYPE_OPTIONS: ProductType[] = ['NguyenKhoi', 'CanThucTe']

interface FormState {
  productCode: string
  productName: string
  productCategoryId: string
  goldPurityId: string
  weightGram: string
  productType: ProductType
}

const EMPTY: FormState = {
  productCode: '',
  productName: '',
  productCategoryId: '',
  goldPurityId: '',
  weightGram: '',
  productType: 'NguyenKhoi',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function ProductCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.products')
  const [form, setForm] = useState<FormState>(EMPTY)
  const { mutate: create, isPending } = useCreateProduct()
  const { data: categories = [] } = useCategories()
  const { data: purities = [] } = useGoldPurities()

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const disabled =
    !form.productCode || !form.productName || !form.productCategoryId ||
    !form.weightGram || isNaN(parseFloat(form.weightGram))

  function handleSubmit() {
    if (disabled) return
    create(
      {
        productCode: form.productCode.trim(),
        productName: form.productName.trim(),
        productCategoryId: form.productCategoryId,
        goldPurityId: form.goldPurityId || null,
        weightGram: parseFloat(form.weightGram),
        productType: form.productType,
      },
      {
        onSuccess: () => {
          setForm(EMPTY)
          onClose()
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
        </DialogHeader>

        <FieldGroup className="py-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.productCode')}</FieldLabel>
              <Input
                value={form.productCode}
                onChange={(e) => set('productCode', e.target.value)}
                placeholder="VANG-24K-NHAN"
                className="font-mono uppercase"
              />
            </Field>
            <Field>
              <FieldLabel>{t('form.purity')}</FieldLabel>
              <Select value={form.goldPurityId} onValueChange={(v) => set('goldPurityId', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.purityPlaceholder')}>
                    {(id: string | null) => id ? (purities.find(p => p.id === id)?.ma ?? id) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {purities.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.ma}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>{t('form.productName')}</FieldLabel>
            <Input
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
              placeholder="Nhẫn Vàng 24K Trơn"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.category')}</FieldLabel>
              <Select value={form.productCategoryId} onValueChange={(v) => set('productCategoryId', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.categoryPlaceholder')}>
                    {(id: string | null) => id ? (categories.find(c => c.id === id)?.name ?? id) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('form.productType')}</FieldLabel>
              <Select value={form.productType} onValueChange={(v) => set('productType', v ?? 'NguyenKhoi')}>
                <SelectTrigger>
                  <SelectValue>
                    {(pt: string | null) => pt ? t(`productTypes.${pt}`) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPE_OPTIONS.map((pt) => (
                    <SelectItem key={pt} value={pt}>{t(`productTypes.${pt}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>{t('form.weight')}</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.weightGram}
              onChange={(e) => set('weightGram', e.target.value)}
              placeholder="3.75"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>{t('createDialog.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={isPending || disabled}>
            {isPending && <Spinner className="mr-2" />}
            {t('createDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
