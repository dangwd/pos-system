'use client'

import type { TableColumnsType } from 'antd'
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
): TableColumnsType<InventoryAdjustment> {
  return [
    {
      title: labels.code,
      dataIndex: 'adjustmentCode',
      key: 'adjustmentCode',
      render: (value: string) => (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
          {value}
        </span>
      ),
    },
    {
      title: labels.direction,
      key: 'direction',
      render: (_: unknown, record: InventoryAdjustment) => {
        const isIn = record.direction === 'IN'
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
      title: labels.product,
      dataIndex: 'productName',
      key: 'productName',
      render: (value: string) => (
        <span className="font-medium">{value}</span>
      ),
    },
    {
      title: labels.counter,
      dataIndex: 'counterName',
      key: 'counterName',
      render: (value: string) => (
        <span className="text-sm">{value || labels.na}</span>
      ),
    },
    {
      title: labels.qty,
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value: number, record: InventoryAdjustment) => {
        const isIn = record.direction === 'IN'
        return (
          <span className={`tabular-nums font-semibold ${isIn ? 'text-green-600' : 'text-destructive'}`}>
            {isIn ? '+' : '−'}{value}
          </span>
        )
      },
    },
    {
      title: labels.weight,
      dataIndex: 'weightGram',
      key: 'weightGram',
      render: (value: number) => (
        <span className="tabular-nums text-sm">
          {value.toLocaleString('lo-LA', { maximumFractionDigits: 2 })} g
        </span>
      ),
    },
    {
      title: labels.nguonGocLo,
      key: 'nguonGocLo',
      render: (_: unknown, record: InventoryAdjustment) => {
        const src = record.nguonGocLo
        if (!src) return <span className="text-muted-foreground">—</span>
        return (
          <Badge variant="outline" className="text-[10px]">
            {src === 'Quan' ? 'Quán' : 'Ngoài'}
          </Badge>
        )
      },
    },
    {
      title: labels.documentRef,
      dataIndex: 'documentRef',
      key: 'documentRef',
      render: (value: string | null) =>
        value
          ? <span className="font-mono text-xs">{value}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      title: labels.supplier,
      dataIndex: 'supplier',
      key: 'supplier',
      render: (value: string | null) =>
        value
          ? <span className="text-sm">{value}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      title: labels.value,
      key: 'value',
      render: (_: unknown, record: InventoryAdjustment) => {
        const v = record.actualValue
        if (v == null) return <span className="text-muted-foreground">—</span>
        return <span className="tabular-nums text-sm">{lak(v)} ₭</span>
      },
    },
    {
      title: labels.reason,
      dataIndex: 'reason',
      key: 'reason',
      render: (value: string | null) => (
        <span className="line-clamp-2 max-w-[200px] text-sm text-muted-foreground">
          {value || '—'}
        </span>
      ),
    },
    {
      title: labels.createdAt,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(value).toLocaleString('lo-LA')}
        </span>
      ),
    },
  ]
}
