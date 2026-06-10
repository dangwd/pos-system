'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import type { InventoryItem } from '@/types/inventory'

export interface InventoryColumnLabels {
  product: string
  branch: string
  qty: string
  status: string
  source: string
  tray: string
  updatedAt: string
  openMenu: string
  viewDetail: string
}

export function createInventoryColumns(labels: InventoryColumnLabels): ColumnDef<InventoryItem>[] {
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
      cell: ({ row }) => <div className="font-medium">{row.getValue('productName')}</div>,
    },
    {
      accessorKey: 'branchId',
      header: labels.branch,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: labels.qty,
      cell: ({ getValue }) => (
        <span className="font-semibold">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: 'trangThai',
      header: labels.status,
      cell: ({ getValue }) => {
        const status = getValue() as string
        const variantMap: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
          Available: 'default',
          Reserved: 'outline',
          Sold: 'secondary',
          Returned: 'destructive',
        }
        return <Badge variant={variantMap[status] ?? 'secondary'}>{status}</Badge>
      },
    },
    {
      accessorKey: 'trayId',
      header: labels.tray,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: labels.updatedAt,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(getValue() as string).toLocaleDateString('lo-LA')}
        </span>
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
            <DropdownMenuItem onClick={() => console.log('view', row.original.id)}>
              {labels.viewDetail}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
