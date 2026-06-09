/**
 * Admin — Products page
 *
 * Dùng <DataTable> reusable + createProductColumns(labels) tách riêng.
 */

'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProductRepository } from '@/lib/repositories/product.repository'
import { DataTable } from '@/components/pos/DataTable'
import { createProductColumns } from '@/components/pos/columns/product-columns'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

const repo = new ProductRepository()

export default function ProductsPage() {
  const t = useTranslations('admin.products')

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => repo.getAll(),
    staleTime: 1000 * 60,
  })

  const columns = useMemo(() => createProductColumns({
    product:    t('columns.product'),
    category:   t('columns.category'),
    unitPrice:  t('columns.unitPrice'),
    stock:      t('columns.stock'),
    outOfStock: t('columns.outOfStock'),
    inStock:    (qty: number) => t('columns.inStock', { qty }),
    openMenu:   t('columns.openMenu'),
    edit:       t('columns.edit'),
    delete:     t('columns.delete'),
  }), [t])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle', { count: products.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          searchKey="productName"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
    </div>
  )
}
