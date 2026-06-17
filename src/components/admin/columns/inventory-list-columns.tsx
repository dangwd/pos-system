'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import { RightOutlined } from '@ant-design/icons'
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
  onView,
}: {
  labels: InventoryListLabels
  onView: (item: InventoryItem) => void
}): TableColumnsType<InventoryItem> {
  return [
    {
      title: labels.productCode,
      dataIndex: 'productCode',
      key: 'productCode',
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      ),
    },
    {
      title: labels.productName,
      dataIndex: 'productName',
      key: 'productName',
      render: (value: string) => (
        <span className="font-medium leading-snug">{value}</span>
      ),
    },
    {
      title: labels.purity,
      dataIndex: 'purity',
      key: 'purity',
      render: (value: string | null) =>
        value
          ? <Badge variant="secondary" className="text-[10px]">{value}</Badge>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      title: labels.counter,
      dataIndex: 'counterName',
      key: 'counterName',
      render: (value: string) => <span className="text-sm">{value}</span>,
    },
    {
      title: labels.source,
      key: 'nguonGoc',
      render: (_: unknown, record: InventoryItem) => {
        const isQuan = record.nguonGoc === 'Quan'
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
      title: labels.qty,
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value: number) => (
        <span className="tabular-nums font-semibold">{value}</span>
      ),
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
      title: labels.status,
      key: 'trangThai',
      render: (_: unknown, record: InventoryItem) => {
        const style = STATUS_STYLE[record.trangThai]
        return (
          <Badge variant={style.variant} className={`text-[11px] ${style.className}`}>
            {labels.statusLabels[record.trangThai]}
          </Badge>
        )
      },
    },
    {
      title: labels.updatedAt,
      dataIndex: 'lastUpdatedAt',
      key: 'lastUpdatedAt',
      render: (value: string) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(value).toLocaleString('lo-LA')}
        </span>
      ),
    },
    {
      title: '',
      key: 'chevron',
      width: 48,
      align: 'center' as const,
      render: (_: unknown, record: InventoryItem) => (
        <button
          type="button"
          onClick={() => onView(record)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RightOutlined className="h-4 w-4" />
        </button>
      ),
    },
  ]
}
