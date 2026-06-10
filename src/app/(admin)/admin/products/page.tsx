'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { createProductColumns } from '@/components/admin/columns/product-columns'
import { ProductCreateDialog } from '@/components/admin/products/ProductCreateDialog'
import { ProductEditDialog } from '@/components/admin/products/ProductEditDialog'
import { useProducts, useDeactivateProduct } from '@/hooks/useProducts'
import type { Product } from '@/types/product'

export default function ProductsPage() {
  const t = useTranslations('admin.products')
  const [createOpen, setCreateOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const { data: products = [], isLoading } = useProducts()
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

      {isLoading ? (
        <TablePageSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={products}
          searchKey="productName"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}

      <ProductCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ProductEditDialog product={editProduct} onClose={() => setEditProduct(null)} />
    </div>
  )
}
