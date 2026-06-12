'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'
import { useGoldPurities } from '@/hooks/useConfig'
import type { ProductType } from '@/types/product'

const PRODUCT_TYPE_OPTIONS: ProductType[] = ['NguyenKhoi', 'GiaDinh']

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
      <DialogContent
        className="sm:max-w-2xl"
        title={t('createDialog.title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('createDialog.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isPending || disabled}>
              {isPending && <Spinner className="mr-2" />}
              {t('createDialog.submit')}
            </Button>
          </DialogFooter>
        }
      >
        <FieldGroup className="py-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.productCode')}</FieldLabel>
              <Input
                value={form.productCode}
                onChange={(e) => set('productCode', e.target.value)}
                placeholder="VANG-24K-NHAN"
                className="h-9 font-mono uppercase"
              />
            </Field>
            <Field>
              <FieldLabel>{t('form.purity')}</FieldLabel>
              <Select
                value={form.goldPurityId || undefined}
                onChange={v => set('goldPurityId', v ?? '')}
                placeholder={t('form.purityPlaceholder')}
                options={purities.map(p => ({ value: p.id, label: p.ma }))}
                allowClear
                notFoundContent="Không tìm thấy"
                className="w-full"
                popupMatchSelectWidth={false}
              />
            </Field>
          </div>

          <Field>
            <FieldLabel>{t('form.productName')}</FieldLabel>
            <Input
              value={form.productName}
              onChange={(e) => set('productName', e.target.value)}
              placeholder="Nhẫn Vàng 24K Trơn"
              className="h-9"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.category')}</FieldLabel>
              <Select
                value={form.productCategoryId || undefined}
                onChange={v => v && set('productCategoryId', v)}
                placeholder={t('form.categoryPlaceholder')}
                options={categories.map(c => ({ value: c.id, label: c.name }))}
                showSearch
                filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
                notFoundContent="Không tìm thấy"
                className="w-full"
                popupMatchSelectWidth={false}
              />
            </Field>
            <Field>
              <FieldLabel>{t('form.productType')}</FieldLabel>
              <Select
                value={form.productType}
                onChange={v => v && set('productType', v)}
                options={PRODUCT_TYPE_OPTIONS.map(pt => ({ value: pt, label: t(`productTypes.${pt}`) }))}
                className="w-full"
                popupMatchSelectWidth={false}
              />
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
              className="h-9"
            />
          </Field>
        </FieldGroup>

      </DialogContent>
    </Dialog>
  )
}
