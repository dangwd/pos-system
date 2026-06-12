/**
 * order-columns — Column definitions cho bảng nhật ký giao dịch (TanStack Table)
 *
 * Dùng factory function createOrderColumns(labels) để nhận text đã dịch từ page.
 * Page gọi useTranslations() rồi truyền vào — columns không tự dùng hook.
 */

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
import { ArrowUpDown, Eye, MoreHorizontal } from 'lucide-react'
import type { Transaction, TransactionStatus, TransactionType } from '@/types/transaction'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

// Màu badge theo loại nghiệp vụ
const TYPE_STYLE: Record<string, string> = {
  SellGold:        'bg-green-100/80 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  SellSilver:      'bg-teal-100/80 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400',
  BuyGold:         'bg-blue-100/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  BuyMoreGold:     'bg-blue-100/80 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  ExchangeGold:    'bg-amber-100/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  ExchangeFree:    'bg-amber-100/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  ExchangeToMoney: 'bg-indigo-100/80 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  ExchangeCurrency:'bg-violet-100/80 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
}

export interface OrderColumnLabels {
  invoiceCode: string
  time: string
  type: string
  payment: string
  amount: string
  status: string
  openMenu: string
  viewDetail: string
  transactionTypes: Record<string, string>
  transactionStatuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>
  onViewDetail?: (tx: Transaction) => void
}

export function createOrderColumns(labels: OrderColumnLabels): ColumnDef<Transaction>[] {
  return [
    {
      accessorKey: 'invoiceCode',
      header: labels.invoiceCode,
      cell: ({ getValue, row }) => (
        <span className="font-mono text-xs font-medium">
          {(getValue() as string) ?? `#${row.original.id.slice(0, 8).toUpperCase()}`}
        </span>
      ),
    },

    {
      accessorKey: 'transactedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {labels.time}
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
      cell: ({ getValue }) =>
        new Date(getValue() as string).toLocaleString('lo-LA', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      sortingFn: 'datetime',
    },

    {
      accessorKey: 'type',
      header: labels.type,
      cell: ({ getValue }) => {
        const type = getValue() as TransactionType
        const label = labels.transactionTypes[type] ?? type
        const cls = TYPE_STYLE[type] ?? 'bg-secondary text-secondary-foreground'
        return (
          <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
            {label}
          </span>
        )
      },
    },

    {
      accessorKey: 'paymentMethod',
      header: labels.payment,
      cell: ({ getValue }) => (
        <span className="text-xs text-muted-foreground tabular-nums">{getValue() as string}</span>
      ),
    },

    {
      accessorKey: 'totalAmount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {labels.amount}
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
      cell: ({ getValue }) => (
        <span className="font-semibold tabular-nums">{formatKip(getValue() as number)}</span>
      ),
    },

    {
      accessorKey: 'status',
      header: labels.status,
      cell: ({ getValue }) => {
        const val = getValue() as TransactionStatus
        const cfg = labels.transactionStatuses[val]
          ?? { label: val, variant: 'secondary' as const }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
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
            <DropdownMenuItem onClick={() => labels.onViewDetail?.(row.original)}>
              <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {labels.viewDetail}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
