'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
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
              <Combobox
                value={form.goldPurityId || null}
                onValueChange={v => set('goldPurityId', v ?? '')}
              >
                <ComboboxInput
                  placeholder={t('form.purityPlaceholder')}
                  showClear
                  className="h-9"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {purities.map((p) => (
                      <ComboboxItem key={p.id} value={p.id}>{p.ma}</ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>—</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
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
              <Combobox
                value={form.productCategoryId || null}
                onValueChange={v => v && set('productCategoryId', v)}
              >
                <ComboboxInput
                  placeholder={t('form.categoryPlaceholder')}
                  className="h-9"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {categories.map((c) => (
                      <ComboboxItem key={c.id} value={c.id}>{c.name}</ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>—</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </Field>
            <Field>
              <FieldLabel>{t('form.productType')}</FieldLabel>
              <Combobox
                value={form.productType}
                onValueChange={v => v && set('productType', v)}
              >
                <ComboboxInput className="h-9" />
                <ComboboxContent>
                  <ComboboxList>
                    {PRODUCT_TYPE_OPTIONS.map((pt) => (
                      <ComboboxItem key={pt} value={pt}>{t(`productTypes.${pt}`)}</ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
