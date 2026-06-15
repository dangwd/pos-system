// stock-out-list-columns — column definitions cho trang danh sách xuất kho

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowUpFromLine } from 'lucide-react'
import type { InventoryAdjustment } from '@/types/inventory'

/** Tóm tắt sản phẩm của một phiếu nhiều dòng: "Tên SP đầu +N". */
function productSummary(a: InventoryAdjustment): string {
  if (a.lines.length === 0) return '—'
  const first = a.lines[0].productName
  return a.lines.length > 1 ? `${first} +${a.lines.length - 1}` : first
}

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
      id: 'product',
      header: labels.product,
      cell: ({ row }) => <span className="font-medium">{productSummary(row.original)}</span>,
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
      id: 'totalQuantity',
      header: labels.quantity,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <ArrowUpFromLine className="h-3 w-3 text-destructive" />
          <span className="tabular-nums font-semibold text-destructive">
            {row.original.totalQuantity}
          </span>
        </div>
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
