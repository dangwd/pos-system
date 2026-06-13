'use client'

import { useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { useUpdateProduct, useCategories } from '@/hooks/useProducts'
import { useGoldPurities } from '@/hooks/useConfig'
import type { Product } from '@/types/product'
import type { GoldPurity } from '@/types/config'

// Lọc tuổi vàng/bạc theo danh mục đang chọn (đồng bộ với ProductCreateDialog)
function resolvePurityCategory(categoryName: string): 'Gold' | 'Silver' | undefined {
  const lower = categoryName.toLowerCase()
  if (lower.includes('vàng') || lower.includes('vang') || lower.includes('gold')) return 'Gold'
  if (lower.includes('bạc') || lower.includes('bac') || lower.includes('silver')) return 'Silver'
  return undefined
}

function filterPurities(purities: GoldPurity[], categoryName: string): GoldPurity[] {
  const target = resolvePurityCategory(categoryName)
  if (!target) return purities
  const withCategory = purities.filter((p) => p.category === target)
  return withCategory.length > 0 ? withCategory : purities
}

interface Props {
  product: Product | null
  onClose: () => void
}

type FormData = {
  productName: string
  categoryId: string
  goldPurityId: string
}

type CategoryOption = { id: string; name: string }

// Keyed inner component — remounts when `product` changes so form state
// always initializes from the current entity without a useEffect.
// submitRef is populated so the outer footer button can trigger submission.
function ProductFormBody({
  product,
  categoryOptions,
  allPurities,
  submitRef,
}: {
  product: Product
  categoryOptions: CategoryOption[]
  allPurities: GoldPurity[]
  submitRef: React.MutableRefObject<(() => FormData | null)>
}) {
  const t = useTranslations('admin.products')

  const [productName, setProductName]   = useState(() => product.productName)
  const [categoryId, setCategoryId]     = useState(() => product.category.id)
  const [goldPurityId, setGoldPurityId] = useState(() => product.goldPurityId ?? '')

  const selectedCategory = categoryOptions.find(c => c.id === categoryId)
  const purityOptions = filterPurities(allPurities, selectedCategory?.name ?? '')

  submitRef.current = () => {
    if (!productName || !categoryId) return null
    return { productName, categoryId, goldPurityId }
  }

  return (
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
            value={goldPurityId || undefined}
            onChange={v => setGoldPurityId(v ?? '')}
            placeholder={t('form.purityPlaceholder')}
            options={purityOptions.map(p => ({ value: p.id, label: `${p.ma} (${p.hamLuong}%)` }))}
            showSearch
            allowClear
            filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            notFoundContent="Không tìm thấy"
            className="w-full"
            popupMatchSelectWidth={false}
          />
        </Field>
      </div>
    </div>
  )
}

export function ProductEditDialog({ product, onClose }: Props) {
  const t = useTranslations('admin.products')
  const { mutate: update, isPending } = useUpdateProduct()
  const { data: categories = [] } = useCategories()
  const { data: allPurities = [] } = useGoldPurities()
  const submitRef = useRef<() => FormData | null>(() => null)

  const categoryOptions = useMemo(() => {
    if (!product) return categories
    const included = categories.some(c => c.id === product.category.id)
    return included ? categories : [product.category, ...categories]
  }, [categories, product])

  function handleSubmit() {
    if (!product) return
    const data = submitRef.current()
    if (!data) return
    update(
      {
        id: product.id,
        dto: {
          productName: data.productName.trim(),
          productCategoryId: data.categoryId,
          goldPurityId: data.goldPurityId || null,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!product} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl"
        title={t('editDialog.title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {t('editDialog.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('editDialog.submit')}
            </Button>
          </DialogFooter>
        }
      >
        {product && (
          <ProductFormBody
            key={product.id}
            product={product}
            categoryOptions={categoryOptions}
            allPurities={allPurities}
            submitRef={submitRef}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
