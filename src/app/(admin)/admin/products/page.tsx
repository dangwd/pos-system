'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Select } from 'antd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { createProductColumns } from '@/components/admin/columns/product-columns'
import { ProductCreateDialog } from '@/components/admin/products/ProductCreateDialog'
import { ProductEditDialog } from '@/components/admin/products/ProductEditDialog'
import { useProductsPaged, useCategories, useDeactivateProduct } from '@/hooks/useProducts'
import type { Product } from '@/types/product'

const PAGE_SIZE = 20

export default function ProductsPage() {
  const t = useTranslations('admin.products')

  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => { setFilterSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: categories = [] } = useCategories()
  const { data, isLoading } = useProductsPaged({
    search: filterSearch || undefined,
    categoryCode: filterCategory ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const { mutate: deactivate } = useDeactivateProduct()

  const products = data?.data ?? []

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
            {t('subtitle', { count: data?.total ?? 0 })}
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
        <Select
          value={filterCategory || undefined}
          onChange={v => { setFilterCategory(v ?? null); setPage(1) }}
          placeholder={t('filterAll')}
          options={categories.map(c => ({ value: c.code, label: c.name }))}
          showSearch
          allowClear
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          notFoundContent="Không tìm thấy"
          className="min-w-44"
          popupMatchSelectWidth={false}
        />
      </div>

      {isLoading ? (
        <TablePageSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          hideSearch
          serverPagination={data ? {
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}

      <ProductCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ProductEditDialog product={editProduct} onClose={() => setEditProduct(null)} />
    </div>
  )
}
