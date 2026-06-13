'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { TradeTransaction } from '@/types/trade'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

const LOAI_VARIANT: Record<string, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  DoiHang:      'default',
  MuaThem:      'default',
  DoiMienPhi:   'secondary',
  DoiThanhTien: 'outline',
}

export interface TradeColumnLabels {
  invoiceCode: string
  type: string
  product: string
  weight: string
  total: string
  date: string
  openMenu: string
  viewDetail: string
  typeLabels: Record<string, string>
}

export function createTradeColumns(labels: TradeColumnLabels): TableColumnsType<TradeTransaction> {
  return [
    {
      title: labels.invoiceCode,
      dataIndex: 'txnCode',
      key: 'txnCode',
      sorter: true,
      render: (value: string) => (
        <span className="font-mono text-sm font-medium">{value}</span>
      ),
    },
    {
      title: labels.type,
      dataIndex: 'loai',
      key: 'loai',
      render: (value: string) => (
        <Badge variant={LOAI_VARIANT[value] ?? 'outline'}>
          {labels.typeLabels[value] ?? value}
        </Badge>
      ),
    },
    {
      title: labels.product,
      dataIndex: 'itemCuName',
      key: 'itemCuName',
      render: (value: string) => <span className="text-sm">{value}</span>,
    },
    {
      title: labels.weight,
      dataIndex: 'itemCuWeightGram',
      key: 'itemCuWeightGram',
      render: (value: number) => (
        <span className="text-sm">{value.toFixed(2)} g</span>
      ),
    },
    {
      title: labels.total,
      dataIndex: 'chenhLech',
      key: 'chenhLech',
      render: (value: number) => (
        <span className={`font-semibold ${value < 0 ? 'text-destructive' : ''}`}>
          {value < 0 ? '- ' : ''}{formatKip(Math.abs(value))}
        </span>
      ),
    },
    {
      title: labels.date,
      dataIndex: 'ngayGio',
      key: 'ngayGio',
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {new Date(value).toLocaleDateString('lo-LA')}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, record: TradeTransaction) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('view', record.id)}>
              {labels.viewDetail}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
