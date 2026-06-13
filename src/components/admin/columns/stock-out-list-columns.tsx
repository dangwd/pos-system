// stock-out-list-columns — column definitions cho trang danh sách xuất kho

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpFromLine } from 'lucide-react'
import type { InventoryAdjustment } from '@/types/inventory'

export interface StockOutListLabels {
  code: string
  product: string
  counter: string
  quantity: string
  weight: string
  reason: string
  date: string
}

export function createStockOutListColumns(
  labels: StockOutListLabels,
): ColumnDef<InventoryAdjustment>[] {
  return [
    {
      accessorKey: 'adjustmentCode',
      header: labels.code,
      cell: ({ row }) => (
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-destructive">
          {row.original.adjustmentCode}
        </span>
      ),
    },
    {
      accessorKey: 'productName',
      header: labels.product,
      cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
    },
    {
      accessorKey: 'counterName',
      header: labels.counter,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.counterName || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: labels.quantity,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <ArrowUpFromLine className="h-3 w-3 text-destructive" />
          <span className="tabular-nums font-semibold text-destructive">
            {row.original.quantity}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'weightGram',
      header: labels.weight,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">
          {row.original.weightGram.toLocaleString('lo-LA', { maximumFractionDigits: 2 })} g
        </span>
      ),
    },
    {
      accessorKey: 'reason',
      header: labels.reason,
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[180px] text-sm text-muted-foreground">
          {row.original.reason || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: labels.date,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleString('lo-LA')}
        </span>
      ),
    },
  ]
}
