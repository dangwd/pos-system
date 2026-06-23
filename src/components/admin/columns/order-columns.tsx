'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import type { Transaction, TransactionStatus, TransactionType } from '@/types/transaction'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

// GD đổi ngoại tệ có thể có nhiều tiền đích (vd vừa LAK vừa USD) → cộng tổng
// tiền trả khách theo TỪNG loại tiền, không gộp về một con số LAK gây sai lệch.
function fxTargetTotals(record: Transaction): Record<string, number> {
  const acc: Record<string, number> = {}
  const add = (cur?: string | null, amt?: number | null) => {
    if (!cur || amt == null || amt <= 0) return
    acc[cur] = (acc[cur] ?? 0) + amt
  }
  if (record.exchangeLines?.length) {
    for (const l of record.exchangeLines) {
      const toAmt = l.toAmount != null
        ? l.toAmount
        : l.toRateToLak > 0
          ? Math.round((l.fromAmount * l.fromRateToLak / l.toRateToLak) * 10000) / 10000
          : 0
      add(l.toCurrency, toAmt)
    }
  } else {
    for (const it of record.items) add(it.fxToCurrency, it.fxToAmount)
  }
  return acc
}

function formatFxTarget(cur: string, amt: number): string {
  return cur === 'LAK'
    ? formatKip(Math.round(amt))
    : `${amt.toLocaleString('lo-LA', { maximumFractionDigits: 4 })} ${cur}`
}

const TYPE_STYLE: Record<string, string> = {
  SellGold:        'bg-green-100/80 text-green-700',
  SellSilver:      'bg-teal-100/80 text-teal-700',
  BuyGold:         'bg-blue-100/80 text-blue-700',
  BuySilver:       'bg-slate-100/80 text-slate-700',
  BuyMoreGold:     'bg-blue-100/80 text-blue-700',
  ExchangeGold:    'bg-amber-100/80 text-amber-700',
  ExchangeFree:    'bg-amber-100/80 text-amber-700',
  ExchangeToMoney: 'bg-indigo-100/80 text-indigo-700',
  ExchangeCurrency:'bg-violet-100/80 text-violet-700',
}

export interface OrderColumnLabels {
  colType: string
  colInvoiceCode: string
  colRefCode: string
  colTime: string
  colCustomer: string
  colAmount: string
  colStatus: string
  transactionTypes: Record<string, string>
  transactionStatuses: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>
  showRefCode?: boolean
}

const noWrapHeader = () => ({ style: { whiteSpace: 'nowrap' as const } })

export function createOrderColumns(labels: OrderColumnLabels): TableColumnsType<Transaction> {
  const refCodeColumn: TableColumnsType<Transaction>[number] = {
    title: labels.colRefCode,
    dataIndex: 'referenceInvoiceCode',
    key: 'referenceInvoiceCode',
    width: 110,
    onHeaderCell: noWrapHeader,
    render: (value: string | null) =>
      value
        ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{value}</span>
        : <span style={{ color: '#d1d5db' }}>—</span>,
  }

  return [
    {
      title: labels.colType,
      dataIndex: 'type',
      key: 'type',
      width: 150,
      onHeaderCell: noWrapHeader,
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
      title: labels.colInvoiceCode,
      dataIndex: 'invoiceCode',
      key: 'invoiceCode',
      width: 180,
      onHeaderCell: noWrapHeader,
      render: (value: string | null, record: Transaction) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
          {value ?? `#${record.id.slice(0, 8).toUpperCase()}`}
        </span>
      ),
    },
    ...(labels.showRefCode ? [refCodeColumn] : []),
    {
      title: labels.colTime,
      dataIndex: 'transactedAt',
      key: 'transactedAt',
      width: 140,
      sorter: true,
      onHeaderCell: noWrapHeader,
      render: (value: string) =>
        new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: labels.colCustomer,
      key: 'customer',
      width: 160,
      onHeaderCell: noWrapHeader,
      render: (_: unknown, record: Transaction) =>
        record.customer?.name
          ? <span style={{ fontSize: 13 }}>{record.customer.name}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: labels.colAmount,
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 140,
      align: 'right' as const,
      sorter: true,
      onHeaderCell: noWrapHeader,
      render: (value: number, record: Transaction) => {
        if (record.type === 'ExchangeCurrency') {
          const totals = Object.entries(fxTargetTotals(record))
          if (totals.length > 0) {
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.35 }}>
                {totals.map(([cur, amt]) => (
                  <span key={cur} style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                    {formatFxTarget(cur, amt)}
                  </span>
                ))}
              </div>
            )
          }
        }
        return <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{formatKip(value)}</span>
      },
    },
    {
      title: labels.colStatus,
      dataIndex: 'status',
      key: 'status',
      width: 100,
      onHeaderCell: noWrapHeader,
      render: (value: TransactionStatus) => {
        const cfg = labels.transactionStatuses[value] ?? { label: value, variant: 'secondary' as const }
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
  ]
}
