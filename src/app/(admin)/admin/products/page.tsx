'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { createProductColumns } from '@/components/admin/columns/product-columns'
import { ProductCreateDialog } from '@/components/admin/products/ProductCreateDialog'
import { ProductEditDialog } from '@/components/admin/products/ProductEditDialog'
import { useProducts, useCategories, useDeactivateProduct } from '@/hooks/useProducts'
import type { Product } from '@/types/product'

const ALL = '__all__'

export default function ProductsPage() {
  const t = useTranslations('admin.products')
  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [filterCategory, setFilterCategory] = useState(ALL)
  const [searchInput, setSearchInput] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setFilterSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: categories = [] } = useCategories()
  const { data: products = [], isLoading } = useProducts({
    search: filterSearch || undefined,
    categoryCode: filterCategory !== ALL ? filterCategory : undefined,
  })
  const { mutate: deactivate } = useDeactivateProduct()

  const columns = useMemo(
    () =>
      createProductColumns(
        {
          product: t('columns.product'),
          productCode: t('columns.productCode'),
          category: t('columns.category'),
          purity: t('columns.purity'),
          productType: t('columns.productType'),
          status: t('columns.status'),
          active: t('columns.active'),
          inactive: t('columns.inactive'),
          openMenu: t('columns.openMenu'),
          edit: t('columns.edit'),
          deactivate: t('columns.deactivate'),
          productTypes: {
            NguyenKhoi: t('productTypes.NguyenKhoi'),
            CanThucTe: t('productTypes.CanThucTe'),
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
        <Select value={filterCategory} onValueChange={v => setFilterCategory(v ?? ALL)}>
          <SelectTrigger className="h-8 w-48 text-sm">
            <SelectValue placeholder={t('filterAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
