'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateProduct, useCategories } from '@/hooks/useProducts'
import type { Product, ProductType } from '@/types/product'

const PURITY_OPTIONS = ['9999', '24K', '18K', '14K', '10K', '925', 'Bạc ròng']
const PRODUCT_TYPE_OPTIONS: ProductType[] = ['NguyenKhoi', 'CanThucTe']

interface Props {
  product: Product | null
  onClose: () => void
}

export function ProductEditDialog({ product, onClose }: Props) {
  const t = useTranslations('admin.products')
  const { mutate: update, isPending } = useUpdateProduct()
  const { data: categories = [] } = useCategories()

  const categoryOptions = useMemo(() => {
    if (!product) return categories
    const included = categories.some((c) => c.id === product.category.id)
    return included ? categories : [product.category, ...categories]
  }, [categories, product])

  const [productName, setProductName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [purity, setPurity] = useState('')
  const [weightGram, setWeightGram] = useState('')
  const [productType, setProductType] = useState<ProductType>('NguyenKhoi')

  useEffect(() => {
    if (product) {
      setProductName(product.productName)
      setCategoryId(product.category.id)
      setPurity(product.purity)
      setWeightGram(String(product.weightGram))
      setProductType(product.productType)
    }
  }, [product])

  if (!product) return null

  const disabled = !productName || !categoryId || !purity || !weightGram || isNaN(parseFloat(weightGram))

  const handleSubmit = () => {
    if (disabled) return
    update(
      {
        id: product.id,
        dto: {
          productName: productName.trim(),
          productCategoryId: categoryId,
          purity,
          weightGram: parseFloat(weightGram),
          productType,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Field>
            <FieldLabel>{t('form.productCode')}</FieldLabel>
            <Input value={product.productCode} disabled className="font-mono bg-muted/50" />
          </Field>

          <Field>
            <FieldLabel>{t('form.productName')}</FieldLabel>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.category')}</FieldLabel>
              <Combobox
                value={categoryId || null}
                onValueChange={v => v && setCategoryId(v)}
              >
                <ComboboxInput
                  placeholder={t('form.categoryPlaceholder')}
                  className="h-9"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {categoryOptions.map((c) => (
                      <ComboboxItem key={c.id} value={c.id}>{c.name}</ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>—</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </Field>
            <Field>
              <FieldLabel>{t('form.purity')}</FieldLabel>
              <Combobox
                value={purity || null}
                onValueChange={v => v && setPurity(v)}
              >
                <ComboboxInput
                  placeholder={t('form.purityPlaceholder')}
                  className="h-9"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {PURITY_OPTIONS.map((p) => (
                      <ComboboxItem key={p} value={p}>{p}</ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>—</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('form.weight')}</FieldLabel>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={weightGram}
                onChange={(e) => setWeightGram(e.target.value)}
                placeholder="3.75"
              />
            </Field>
            <Field>
              <FieldLabel>{t('form.productType')}</FieldLabel>
              <Combobox
                value={productType}
                onValueChange={v => v && setProductType(v as ProductType)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('editDialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || disabled}>
            {isPending && <Spinner className="mr-2" />}
            {t('editDialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
