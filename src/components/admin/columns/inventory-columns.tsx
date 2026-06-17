'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EditOutlined } from '@ant-design/icons'
import type { InventoryItem } from '@/types/inventory'
import type { ItemValuation } from '@/lib/inventory-valuation'

export interface InventoryColumnLabels {
  product: string
  priceLink: string
  stdWeight: string
  extraCost: string
  retailPrice: string
  stock: string
  actions: string
  edit: string
  pieces: string
  lot: string
  labor: string
  stone: string
  na: string
}

const lak = (n: number) => n.toLocaleString('lo-LA')

interface CreateColumnsOptions {
  labels: InventoryColumnLabels
  valuate: (item: InventoryItem) => ItemValuation
  toThb: (lak: number) => number | null
  onEdit?: (item: InventoryItem) => void
}

export function createInventoryColumns({
  labels,
  valuate,
  toThb,
  onEdit,
}: CreateColumnsOptions): TableColumnsType<InventoryItem> {
  const columns: TableColumnsType<InventoryItem> = [
    {
      title: labels.product,
      dataIndex: 'productName',
      key: 'productName',
      render: (_: unknown, record: InventoryItem) => (
        <div className="min-w-0">
          <div className="font-semibold leading-tight">{record.productName}</div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">{record.purity || labels.na}</Badge>
            <span className="font-mono text-[10px] text-muted-foreground">ID: {record.productCode}</span>
          </div>
        </div>
      ),
    },
    {
      title: labels.priceLink,
      key: 'priceLink',
      render: (_: unknown, record: InventoryItem) => {
        const v = valuate(record)
        return v.sellPerUnit != null
          ? <span className="text-xs font-medium">{record.purity} · {v.unitCode}</span>
          : <span className="text-muted-foreground">—</span>
      },
    },
    {
      title: labels.stdWeight,
      key: 'stdWeight',
      render: (_: unknown, record: InventoryItem) => {
        const v = valuate(record)
        return (
          <div>
            <div className="text-sm font-medium">
              {v.chiPerUnit.toLocaleString('lo-LA', { maximumFractionDigits: 2 })} Chỉ
            </div>
            <div className="text-[10px] text-muted-foreground">
              ~{v.perPieceGram.toLocaleString('lo-LA', { maximumFractionDigits: 2 })}g
            </div>
          </div>
        )
      },
    },
    {
      title: labels.extraCost,
      key: 'extraCost',
      render: () => (
        <div className="text-[11px] text-muted-foreground leading-tight">
          <div>{labels.labor}: —</div>
          <div>{labels.stone}: —</div>
        </div>
      ),
    },
    {
      title: labels.retailPrice,
      key: 'retailPrice',
      render: (_: unknown, record: InventoryItem) => {
        const v = valuate(record)
        if (v.sellPerUnit == null) return <span className="text-muted-foreground">—</span>
        const thb = toThb(v.retailUnitPrice)
        return (
          <div>
            <div className="text-sm font-semibold text-primary">{lak(v.retailUnitPrice)} ₭</div>
            <div className="text-[10px] text-muted-foreground">
              ~{thb == null ? labels.na : `${thb.toLocaleString('lo-LA', { maximumFractionDigits: 0 })} THB`}
            </div>
          </div>
        )
      },
    },
    {
      title: labels.stock,
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (_: unknown, record: InventoryItem) => {
        const v = valuate(record)
        return (
          <div>
            <Badge variant="outline" className="font-semibold">
              {record.quantity} {labels.pieces}
            </Badge>
            <div className="mt-1 text-[10px] text-muted-foreground">
              {labels.lot}: {lak(v.lotValue)} ₭
            </div>
          </div>
        )
      },
    },
  ]

  if (onEdit) {
    columns.push({
      title: labels.actions,
      key: 'actions',
      render: (_: unknown, record: InventoryItem) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onEdit(record)}
        >
          <EditOutlined className="h-3 w-3" />
          {labels.edit}
        </Button>
      ),
    })
  }

  return columns
}
