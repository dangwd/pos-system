'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { InventoryAdjustment } from '@/types/inventory'

export interface AdjustmentColumnLabels {
  code: string
  product: string
  quantity: string
  payment: string
  value: string
  reason: string
  date: string
  cash: string
  bank: string
}

interface Options {
  /** Hướng phiếu — chỉ IN hiển thị cột thanh toán + giá trị lô. */
  variant: 'IN' | 'OUT'
  labels: AdjustmentColumnLabels
}

const lak = (n: number) => n.toLocaleString('lo-LA')

/**
 * Columns cho lịch sử điều chỉnh kho (InventoryAdjustmentLog, mã ADJ-xxx) —
 * dùng ở 2 màn Nhập kho / Xuất kho. `variant` quyết định dấu/màu số lượng và
 * có hiển thị cột thanh toán/giá trị (chỉ có ý nghĩa với phiếu nhập).
 */
export function createAdjustmentColumns({ variant, labels }: Options): ColumnDef<InventoryAdjustment>[] {
  const columns: ColumnDef<InventoryAdjustment>[] = [
    {
      accessorKey: 'adjustmentCode',
      header: labels.code,
      cell: ({ row }) => (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
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
      accessorKey: 'quantity',
      header: labels.quantity,
      cell: ({ row }) => (
        <span className={`font-semibold tabular-nums ${variant === 'IN' ? 'text-primary' : 'text-destructive'}`}>
          {variant === 'IN' ? '+' : '−'}{row.original.quantity}
        </span>
      ),
    },
  ]

  if (variant === 'IN') {
    columns.push(
      {
        id: 'payment',
        header: labels.payment,
        cell: ({ row }) => {
          const p = row.original.paymentMethod
          if (!p) return <span className="text-muted-foreground">—</span>
          return <Badge variant="secondary" className="text-[10px]">{p === 'CASH' ? labels.cash : labels.bank}</Badge>
        },
      },
      {
        id: 'value',
        header: labels.value,
        cell: ({ row }) =>
          row.original.actualValue != null
            ? <span className="tabular-nums">{lak(row.original.actualValue)} ₭</span>
            : <span className="text-muted-foreground">—</span>,
      },
    )
  }

  columns.push(
    {
      accessorKey: 'reason',
      header: labels.reason,
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[280px] text-sm text-muted-foreground">{row.original.reason || '—'}</span>
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
  )

  return columns
}
