'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
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

export function createTradeColumns(labels: TradeColumnLabels): ColumnDef<TradeTransaction>[] {
  return [
    {
      accessorKey: 'txnCode',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {labels.invoiceCode}
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-medium">{row.getValue('txnCode')}</span>
      ),
    },
    {
      accessorKey: 'loai',
      header: labels.type,
      cell: ({ getValue }) => {
        const type = getValue() as string
        return (
          <Badge variant={LOAI_VARIANT[type] ?? 'outline'}>
            {labels.typeLabels[type] ?? type}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'itemCuName',
      header: labels.product,
      cell: ({ getValue }) => (
        <span className="text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'itemCuWeightGram',
      header: labels.weight,
      cell: ({ getValue }) => (
        <span className="text-sm">{(getValue() as number).toFixed(2)} g</span>
      ),
    },
    {
      accessorKey: 'chenhLech',
      header: labels.total,
      cell: ({ getValue }) => {
        const n = getValue() as number
        return (
          <span className={`font-semibold ${n < 0 ? 'text-destructive' : ''}`}>
            {n < 0 ? '- ' : ''}{formatKip(Math.abs(n))}
          </span>
        )
      },
    },
    {
      accessorKey: 'ngayGio',
      header: labels.date,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(getValue() as string).toLocaleDateString('lo-LA')}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('view', row.original.id)}>
              {labels.viewDetail}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
