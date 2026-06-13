'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import type { InventoryItem, InventoryStatus } from '@/types/inventory'

// ─── Status badge config ─────────────────────────────────────────────────────

const STATUS_STYLE: Record<InventoryStatus, { variant: 'secondary' | 'default' | 'destructive' | 'outline', className: string }> = {
  TiepNhan:    { variant: 'secondary', className: 'bg-muted text-muted-foreground' },
  DaDinhGia:   { variant: 'secondary', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  TrenQuay:    { variant: 'secondary', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  ChuyenXuong: { variant: 'secondary', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  DaBan:       { variant: 'secondary', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  DoiRa:       { variant: 'secondary', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
}

// ─── Status transition rules (dùng cho trang chi tiết) ───────────────────────

export type StatusTransition = {
  buttonLabel: string
  targetStatus: InventoryStatus
}

export function getStatusTransition(
  current: InventoryStatus,
  labels: { pricing: string; putOnDisplay: string; moveToWorkshop: string },
): StatusTransition | null {
  switch (current) {
    case 'TiepNhan':  return { buttonLabel: labels.pricing,        targetStatus: 'DaDinhGia' }
    case 'DaDinhGia': return { buttonLabel: labels.putOnDisplay,   targetStatus: 'TrenQuay' }
    case 'TrenQuay':  return { buttonLabel: labels.moveToWorkshop, targetStatus: 'ChuyenXuong' }
    default:          return null
  }
}

// ─── Column labels ────────────────────────────────────────────────────────────

export interface InventoryListLabels {
  productCode: string
  productName: string
  purity: string
  counter: string
  source: string
  sourceQuan: string
  sourceNgoai: string
  qty: string
  weight: string
  status: string
  statusLabels: Record<InventoryStatus, string>
  updatedAt: string
}

// ─── Columns factory (read-only — mọi action nằm trên trang chi tiết) ────────

export function createInventoryListColumns({
  labels,
}: {
  labels: InventoryListLabels
}): ColumnDef<InventoryItem>[] {
  return [
    {
      accessorKey: 'productCode',
      header: labels.productCode,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.original.productCode}</span>
      ),
    },
    {
      accessorKey: 'productName',
      header: labels.productName,
      cell: ({ row }) => (
        <span className="font-medium leading-snug">{row.original.productName}</span>
      ),
    },
    {
      accessorKey: 'purity',
      header: labels.purity,
      cell: ({ row }) =>
        row.original.purity
          ? <Badge variant="secondary" className="text-[10px]">{row.original.purity}</Badge>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: 'counterName',
      header: labels.counter,
      cell: ({ row }) => <span className="text-sm">{row.original.counterName}</span>,
    },
    {
      id: 'nguonGoc',
      header: labels.source,
      cell: ({ row }) => {
        const isQuan = row.original.nguonGoc === 'Quan'
        return (
          <Badge
            variant="outline"
            className={`text-[10px] ${isQuan ? 'border-primary/40 text-primary' : 'border-muted-foreground/40 text-muted-foreground'}`}
          >
            {isQuan ? labels.sourceQuan : labels.sourceNgoai}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'quantity',
      header: labels.qty,
      cell: ({ row }) => (
        <span className="tabular-nums font-semibold">{row.original.quantity}</span>
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
      id: 'trangThai',
      header: labels.status,
      cell: ({ row }) => {
        const s = row.original.trangThai
        const style = STATUS_STYLE[s]
        return (
          <Badge variant={style.variant} className={`text-[11px] ${style.className}`}>
            {labels.statusLabels[s]}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'lastUpdatedAt',
      header: labels.updatedAt,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(row.original.lastUpdatedAt).toLocaleString('lo-LA')}
        </span>
      ),
    },
    {
      id: 'chevron',
      header: '',
      cell: () => <ChevronRight className="h-4 w-4 text-muted-foreground/50" />,
    },
  ]
}
