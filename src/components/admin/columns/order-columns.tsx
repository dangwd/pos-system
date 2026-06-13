'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Eye, MoreHorizontal } from 'lucide-react'
import type { Transaction, TransactionStatus, TransactionType } from '@/types/transaction'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

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

export function createOrderColumns(labels: OrderColumnLabels): TableColumnsType<Transaction> {
  return [
    {
      title: labels.invoiceCode,
      dataIndex: 'invoiceCode',
      key: 'invoiceCode',
      render: (value: string | null, record: Transaction) => (
        <span className="font-mono text-xs font-medium">
          {value ?? `#${record.id.slice(0, 8).toUpperCase()}`}
        </span>
      ),
    },
    {
      title: labels.time,
      dataIndex: 'transactedAt',
      key: 'transactedAt',
      sorter: true,
      render: (value: string) =>
        new Date(value).toLocaleString('lo-LA', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
    },
    {
      title: labels.type,
      dataIndex: 'type',
      key: 'type',
      render: (value: TransactionType) => {
        const label = labels.transactionTypes[value] ?? value
        const cls = TYPE_STYLE[value] ?? 'bg-secondary text-secondary-foreground'
        return (
          <span className={`inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
            {label}
          </span>
        )
      },
    },
    {
      title: labels.payment,
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      render: (value: string) => (
        <span className="text-xs text-muted-foreground tabular-nums">{value}</span>
      ),
    },
    {
      title: labels.amount,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      sorter: true,
      render: (value: number) => (
        <span className="font-semibold tabular-nums">{formatKip(value)}</span>
      ),
    },
    {
      title: labels.status,
      dataIndex: 'status',
      key: 'status',
      render: (value: TransactionStatus) => {
        const cfg = labels.transactionStatuses[value] ?? { label: value, variant: 'secondary' as const }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, record: Transaction) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => labels.onViewDetail?.(record)}>
              <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              {labels.viewDetail}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
