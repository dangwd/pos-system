'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
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
  pieces: string   // "chiếc"
  lot: string      // "Lô"
  labor: string    // "Công"
  stone: string    // "Đá"
  na: string       // "N/A"
}

const lak = (n: number) => n.toLocaleString('lo-LA')

interface CreateColumnsOptions {
  labels: InventoryColumnLabels
  valuate: (item: InventoryItem) => ItemValuation
  toThb: (lak: number) => number | null
  /** Bỏ trống ⇒ ẩn cột thao tác (người dùng không có quyền INVENTORY_MANAGE). */
  onEdit?: (item: InventoryItem) => void
}

export function createInventoryColumns({
  labels,
  valuate,
  toThb,
  onEdit,
}: CreateColumnsOptions): ColumnDef<InventoryItem>[] {
  const columns: ColumnDef<InventoryItem>[] = [
    {
      accessorKey: 'productName',
      header: labels.product,
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="min-w-0">
            <div className="font-semibold leading-tight">{item.productName}</div>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant="secondary" className="text-[10px]">{item.purity || labels.na}</Badge>
              <span className="font-mono text-[10px] text-muted-foreground">ID: {item.productCode}</span>
            </div>
          </div>
        )
      },
    },
    {
      id: 'priceLink',
      header: labels.priceLink,
      cell: ({ row }) => {
        const v = valuate(row.original)
        return v.sellPerUnit != null
          ? <span className="text-xs font-medium">{row.original.purity} · {v.unitCode}</span>
          : <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'stdWeight',
      header: labels.stdWeight,
      cell: ({ row }) => {
        const v = valuate(row.original)
        return (
          <div>
            <div className="text-sm font-medium">{v.chiPerUnit.toLocaleString('lo-LA', { maximumFractionDigits: 2 })} Chỉ</div>
            <div className="text-[10px] text-muted-foreground">~{v.perPieceGram.toLocaleString('lo-LA', { maximumFractionDigits: 2 })}g</div>
          </div>
        )
      },
    },
    {
      id: 'extraCost',
      header: labels.extraCost,
      cell: () => (
        // Tiền công / tiền đá là thuộc tính quầy — không có trong API inventory
        <div className="text-[11px] text-muted-foreground leading-tight">
          <div>{labels.labor}: —</div>
          <div>{labels.stone}: —</div>
        </div>
      ),
    },
    {
      id: 'retailPrice',
      header: labels.retailPrice,
      cell: ({ row }) => {
        const v = valuate(row.original)
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
      accessorKey: 'quantity',
      header: labels.stock,
      cell: ({ row }) => {
        const v = valuate(row.original)
        return (
          <div>
            <Badge variant="outline" className="font-semibold">{row.original.quantity} {labels.pieces}</Badge>
            <div className="mt-1 text-[10px] text-muted-foreground">{labels.lot}: {lak(v.lotValue)} ₭</div>
          </div>
        )
      },
    },
  ]

  if (onEdit) {
    columns.push({
      id: 'actions',
      header: labels.actions,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => onEdit(row.original)}
        >
          <Pencil className="h-3 w-3" />
          {labels.edit}
        </Button>
      ),
    })
  }

  return columns
}
