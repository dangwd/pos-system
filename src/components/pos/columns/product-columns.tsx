/**
 * product-columns — Column definitions cho bảng sản phẩm (TanStack Table)
 *
 * Dùng factory function createProductColumns(labels) để nhận text đã dịch từ page.
 */

'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import type { Product } from '@/types/product'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

export interface ProductColumnLabels {
  product: string
  category: string
  unitPrice: string
  stock: string
  outOfStock: string
  inStock: (qty: number) => string
  openMenu: string
  edit: string
  delete: string
}

export function createProductColumns(labels: ProductColumnLabels): ColumnDef<Product>[] {
  return [
    {
      accessorKey: 'productName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {labels.product}
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('productName')}</div>
      ),
    },

    {
      accessorKey: 'category',
      header: labels.category,
      cell: ({ getValue }) => {
        const cat = getValue() as { name: string } | string
        const name = typeof cat === 'object' ? cat.name : cat
        return <Badge variant="secondary">{name}</Badge>
      },
    },

    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('edit', row.original.id)}>
              {labels.edit}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => console.log('delete', row.original.id)}
            >
              {labels.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

// Legacy export kept for backwards-compat with any unused references
export const productColumns = createProductColumns({
  product: 'Product',
  category: 'Category',
  unitPrice: 'Unit Price',
  stock: 'Stock',
  outOfStock: 'Out of stock',
  inStock: (qty) => `${qty} in stock`,
  openMenu: 'Open menu',
  edit: 'Edit',
  delete: 'Delete',
})
