'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateProduct, useCategories } from '@/hooks/useProducts'
import type { Product } from '@/types/product'

const PURITY_OPTIONS = ['9999', '24K', '18K', '14K', '10K', '925', 'Bạc ròng']

interface Props {
  product: Product | null
  onClose: () => void
}

export function ProductEditDialog({ product, onClose }: Props) {
  const t = useTranslations('admin.products')
  const { mutate: update, isPending } = useUpdateProduct()
  const { data: categories = [] } = useCategories()

  // Đảm bảo category hiện tại luôn có trong danh sách dù API chưa load xong
  const categoryOptions = useMemo(() => {
    if (!product) return categories
    const alreadyIncluded = categories.some((c) => c.id === product.category.id)
    return alreadyIncluded ? categories : [product.category, ...categories]
  }, [categories, product])

  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [purity, setPurity] = useState('')
  const [weightPerUnitMg, setWeightPerUnitMg] = useState('')

  useEffect(() => {
    if (product) {
      setProductName(product.productName)
      setCategoryId(product.category.id)
      setPurity(product.purity)
      setWeightPerUnitMg(String(product.weightPerUnitMg))
    }
  }, [product])

  if (!product) return null

  const handleSubmit = () => {
    const weight = parseFloat(weightPerUnitMg)
    if (!productName || !categoryId || !purity || isNaN(weight)) return
    update(
      { id: product.id, dto: { productName: productName.trim(), productCategoryId: categoryId, purity, weightPerUnitMg: weight } },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <Field>
            <FieldLabel>{t('form.productCode')}</FieldLabel>
            <Input value={product.productCode} disabled className="font-mono bg-muted/50" />
          </Field>

          <Field>
            <FieldLabel>{t('form.productName')}</FieldLabel>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.category')}</FieldLabel>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder={t('form.categoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('form.purity')}</FieldLabel>
              <Select value={purity} onValueChange={(v) => setPurity(v ?? '')}>
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
            <FieldLabel>{t('form.weight')}</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={weightPerUnitMg}
              onChange={(e) => setWeightPerUnitMg(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !productName || !categoryId || !purity || !weightPerUnitMg}
          >
            {isPending && <Spinner className="mr-2" />}
            {t('editDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
