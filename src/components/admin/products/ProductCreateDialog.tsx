'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useCreateProduct, useCategories } from '@/hooks/useProducts'

const PURITY_OPTIONS = ['9999', '24K', '18K', '14K', '10K', '925', 'Bạc ròng']

const EMPTY: FormState = {
  productCode: '',
  productName: '',
  productCategoryId: '',
  purity: '',
  weightPerUnitMg: '',
}

interface FormState {
  productCode: string
  productName: string
  productCategoryId: string
  purity: string
  weightPerUnitMg: string
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

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const weight = parseFloat(form.weightPerUnitMg)
    if (!form.productCode || !form.productName || !form.productCategoryId || !form.purity || isNaN(weight)) return
    create(
      {
        productCode: form.productCode.trim(),
        productName: form.productName.trim(),
        productCategoryId: form.productCategoryId,
        purity: form.purity,
        weightPerUnitMg: weight,
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

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
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
              <Select value={form.purity} onValueChange={(v) => set('purity', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.purityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {PURITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
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
                  <SelectValue placeholder={t('form.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('form.weight')}</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={form.weightPerUnitMg}
                onChange={(e) => set('weightPerUnitMg', e.target.value)}
                placeholder="3750"
              />
            </Field>
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('createDialog.title') === t('createDialog.title') ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={isPending || !form.productCode || !form.productName || !form.productCategoryId || !form.purity || !form.weightPerUnitMg}
          >
            {isPending && <Spinner className="mr-2" />}
            {t('createDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
