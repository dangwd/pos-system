'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type FormData = {
  productName: string
  categoryId: string
  purity: string
  weightGram: string
  productType: ProductType
}

type CategoryOption = { id: string; name: string }

// Keyed inner component — remounts when `product` changes so form state
// always initializes from the current entity without a useEffect.
function ProductFormBody({
  product,
  categoryOptions,
  isPending,
  onCancel,
  onSubmit,
}: {
  product: Product
  categoryOptions: CategoryOption[]
  isPending: boolean
  onCancel: () => void
  onSubmit: (data: FormData) => void
}) {
  const t = useTranslations('admin.products')

  const [productName, setProductName] = useState(() => product.productName)
  const [categoryId, setCategoryId]   = useState(() => product.category.id)
  const [purity, setPurity]           = useState(() => product.purity)
  const [weightGram, setWeightGram]   = useState(() => String(product.weightGram))
  const [productType, setProductType] = useState<ProductType>(() => product.productType)

  const disabled = !productName || !categoryId || !purity || !weightGram || isNaN(parseFloat(weightGram))

  return (
    <>
      <div className="space-y-3 py-1">
        <Field>
          <FieldLabel>{t('form.productCode')}</FieldLabel>
          <Input value={product.productCode} disabled className="h-9 font-mono bg-muted/50" />
        </Field>

        <Field>
          <FieldLabel>{t('form.productName')}</FieldLabel>
          <Input value={productName} onChange={e => setProductName(e.target.value)} className="h-9" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>{t('form.category')}</FieldLabel>
            <Select
              value={categoryId || undefined}
              onChange={v => v && setCategoryId(v)}
              placeholder={t('form.categoryPlaceholder')}
              options={categoryOptions.map(c => ({ value: c.id, label: c.name }))}
              showSearch
              filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
              notFoundContent="Không tìm thấy"
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </Field>
          <Field>
            <FieldLabel>{t('form.purity')}</FieldLabel>
            <Select
              value={purity || undefined}
              onChange={v => v && setPurity(v)}
              placeholder={t('form.purityPlaceholder')}
              options={PURITY_OPTIONS.map(p => ({ value: p, label: p }))}
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
            <FieldLabel>{t('form.weight')}</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={weightGram}
              onChange={e => setWeightGram(e.target.value)}
              placeholder="3.75"
              className="h-9"
            />
          </Field>
          <Field>
            <FieldLabel>{t('form.productType')}</FieldLabel>
            <Select
              value={productType}
              onChange={v => v && setProductType(v as ProductType)}
              options={PRODUCT_TYPE_OPTIONS.map(pt => ({ value: pt, label: t(`productTypes.${pt}`) }))}
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </Field>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          {t('editDialog.cancel')}
        </Button>
        <Button
          onClick={() => onSubmit({ productName, categoryId, purity, weightGram, productType })}
          disabled={isPending || disabled}
        >
          {isPending && <Spinner className="mr-2" />}
          {t('editDialog.submit')}
        </Button>
      </DialogFooter>
    </>
  )
}

export function ProductEditDialog({ product, onClose }: Props) {
  const t = useTranslations('admin.products')
  const { mutate: update, isPending } = useUpdateProduct()
  const { data: categories = [] } = useCategories()

  const categoryOptions = useMemo(() => {
    if (!product) return categories
    const included = categories.some(c => c.id === product.category.id)
    return included ? categories : [product.category, ...categories]
  }, [categories, product])

  function handleSubmit({ productName, categoryId, purity, weightGram, productType }: FormData) {
    if (!product) return
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
    <Dialog open={!!product} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
        </DialogHeader>
        {product && (
          <ProductFormBody
            key={product.id}
            product={product}
            categoryOptions={categoryOptions}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
