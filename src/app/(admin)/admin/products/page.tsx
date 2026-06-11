'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { createProductColumns } from '@/components/admin/columns/product-columns'
import { ProductCreateDialog } from '@/components/admin/products/ProductCreateDialog'
import { ProductEditDialog } from '@/components/admin/products/ProductEditDialog'
import { useProducts, useCategories, useDeactivateProduct } from '@/hooks/useProducts'
import type { Product } from '@/types/product'

const TRIGGER = "inline-flex h-8 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm font-normal hover:bg-accent hover:text-accent-foreground transition-colors w-full"

export default function ProductsPage() {
  const t = useTranslations('admin.products')

  const categoryAnchor = useRef<HTMLDivElement>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setFilterSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: categories = [] } = useCategories()
  const { data: products = [], isLoading } = useProducts({
    search: filterSearch || undefined,
    categoryCode: filterCategory ?? undefined,
  })
  const { mutate: deactivate } = useDeactivateProduct()

  const selectedCategory = categories.find(c => c.code === filterCategory)

  const columns = useMemo(
    () => createProductColumns(
      {
        product:     t('columns.product'),
        productCode: t('columns.productCode'),
        category:    t('columns.category'),
        purity:      t('columns.purity'),
        productType: t('columns.productType'),
        status:      t('columns.status'),
        active:      t('columns.active'),
        inactive:    t('columns.inactive'),
        openMenu:    t('columns.openMenu'),
        edit:        t('columns.edit'),
        deactivate:  t('columns.deactivate'),
        productTypes: {
          NguyenKhoi: t('productTypes.NguyenKhoi'),
          CanThucTe:  t('productTypes.CanThucTe'),
        },
      },
      (product) => setEditProduct(product),
      (product) => deactivate(product.id),
    ),
    [t, deactivate],
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle', { count: products.length })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="h-8 w-56 text-sm"
        />

        {/* Category */}
        <div ref={categoryAnchor} className="inline-flex min-w-44">
          <Combobox
            value={filterCategory ?? ""}
            onValueChange={setFilterCategory}
          >
            <ComboboxTrigger className={TRIGGER}>
              {selectedCategory
                ? selectedCategory.name
                : <span className="text-muted-foreground">{t('filterAll')}</span>
              }
            </ComboboxTrigger>
            <ComboboxContent anchor={categoryAnchor}>
              <ComboboxInput placeholder={t('filterAll')} />
              <ComboboxList>
                <ComboboxItem value="">{t('filterAll')}</ComboboxItem>
                {categories.map(c => (
                  <ComboboxItem key={c.code} value={c.code}>{c.name}</ComboboxItem>
                ))}
              </ComboboxList>
              <ComboboxEmpty>Không tìm thấy</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>

      {isLoading ? (
        <TablePageSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          hideSearch
        />
      )}

      <ProductCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ProductEditDialog product={editProduct} onClose={() => setEditProduct(null)} />
    </div>
  )
}
