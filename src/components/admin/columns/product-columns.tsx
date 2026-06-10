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

export interface ProductColumnLabels {
  product: string
  productCode: string
  category: string
  purity: string
  status: string
  active: string
  inactive: string
  openMenu: string
  edit: string
  deactivate: string
}

export function createProductColumns(
  labels: ProductColumnLabels,
  onEdit: (product: Product) => void,
  onDeactivate: (product: Product) => void,
): ColumnDef<Product>[] {
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
      accessorKey: 'productCode',
      header: labels.productCode,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{getValue() as string}</span>
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
      accessorKey: 'purity',
      header: labels.purity,
      cell: ({ getValue }) => (
        <span className="text-xs font-medium">{getValue() as string}</span>
      ),
    },

    {
      accessorKey: 'isActive',
      header: labels.status,
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'default' : 'outline'}>
          {getValue() ? labels.active : labels.inactive}
        </Badge>
      ),
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
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              {labels.edit}
            </DropdownMenuItem>
            {row.original.isActive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeactivate(row.original)}
                >
                  {labels.deactivate}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
