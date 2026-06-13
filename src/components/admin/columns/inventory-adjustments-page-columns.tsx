'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import type { InventoryAdjustment } from '@/types/inventory'

const lak = (n: number) => n.toLocaleString('lo-LA', { maximumFractionDigits: 0 })

export interface AdjustmentsPageLabels {
  code: string
  direction: string
  dirIn: string
  dirOut: string
  product: string
  counter: string
  qty: string
  weight: string
  nguonGocLo: string
  documentRef: string
  supplier: string
  value: string
  reason: string
  createdAt: string
  cash: string
  bank: string
  na: string
}

export function createAdjustmentsPageColumns(
  labels: AdjustmentsPageLabels,
): ColumnDef<InventoryAdjustment>[] {
  return [
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
      id: 'direction',
      header: labels.direction,
      cell: ({ row }) => {
        const isIn = row.original.direction === 'IN'
        return (
          <Badge
            variant="secondary"
            className={`gap-1 text-[11px] ${isIn
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isIn
              ? <ArrowDownToLine className="h-3 w-3" />
              : <ArrowUpFromLine className="h-3 w-3" />
            }
            {isIn ? labels.dirIn : labels.dirOut}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'productName',
      header: labels.product,
      cell: ({ row }) => (
        <span className="font-medium">{row.original.productName}</span>
      ),
    },
    {
      accessorKey: 'counterName',
      header: labels.counter,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.counterName || labels.na}</span>
      ),
    },
    {
      accessorKey: 'quantity',
      header: labels.qty,
      cell: ({ row }) => {
        const isIn = row.original.direction === 'IN'
        return (
          <span className={`tabular-nums font-semibold ${isIn ? 'text-green-600' : 'text-destructive'}`}>
            {isIn ? '+' : '−'}{row.original.quantity}
          </span>
        )
      },
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
      id: 'nguonGocLo',
      header: labels.nguonGocLo,
      cell: ({ row }) => {
        const src = row.original.nguonGocLo
        if (!src) return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant="outline" className="text-[10px]">
            {src === 'Quan' ? 'Quán' : 'Ngoài'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'documentRef',
      header: labels.documentRef,
      cell: ({ row }) =>
        row.original.documentRef
          ? <span className="font-mono text-xs">{row.original.documentRef}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'supplier',
      header: labels.supplier,
      cell: ({ row }) =>
        row.original.supplier
          ? <span className="text-sm">{row.original.supplier}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'value',
      header: labels.value,
      cell: ({ row }) => {
        const v = row.original.actualValue
        if (v == null) return <span className="text-muted-foreground">—</span>
        return <span className="tabular-nums text-sm">{lak(v)} ₭</span>
      },
    },
    {
      accessorKey: 'reason',
      header: labels.reason,
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-[200px] text-sm text-muted-foreground">
          {row.original.reason || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: labels.createdAt,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleString('lo-LA')}
        </span>
      ),
    },
  ]
}
