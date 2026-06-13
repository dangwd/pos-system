'use client'

import type { TableColumnsType } from 'antd'
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

export function createAdjustmentColumns({ variant, labels }: Options): TableColumnsType<InventoryAdjustment> {
  const columns: TableColumnsType<InventoryAdjustment> = [
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
      title: labels.product,
      dataIndex: 'productName',
      key: 'productName',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      title: labels.quantity,
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value: number) => (
        <span className={`font-semibold tabular-nums ${variant === 'IN' ? 'text-primary' : 'text-destructive'}`}>
          {variant === 'IN' ? '+' : '−'}{value}
        </span>
      ),
    },
  ]

  if (variant === 'IN') {
    columns.push(
      {
        title: labels.payment,
        key: 'payment',
        render: (_: unknown, record: InventoryAdjustment) => {
          const p = record.paymentMethod
          if (!p) return <span className="text-muted-foreground">—</span>
          return (
            <Badge variant="secondary" className="text-[10px]">
              {p === 'CASH' ? labels.cash : labels.bank}
            </Badge>
          )
        },
      },
      {
        title: labels.value,
        key: 'value',
        render: (_: unknown, record: InventoryAdjustment) =>
          record.actualValue != null
            ? <span className="tabular-nums">{lak(record.actualValue)} ₭</span>
            : <span className="text-muted-foreground">—</span>,
      },
    )
  }

  columns.push(
    {
      title: labels.reason,
      dataIndex: 'reason',
      key: 'reason',
      render: (value: string) => (
        <span className="line-clamp-1 max-w-70 text-sm text-muted-foreground">
          {value || '—'}
        </span>
      ),
    },
    {
      title: labels.date,
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(value).toLocaleString('lo-LA')}
        </span>
      ),
    },
  )

  return columns
}
