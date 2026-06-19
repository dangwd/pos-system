'use client'

import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { formatNum } from '@/components/admin/reports/report-ui'
import type { Transaction } from '@/types/transaction'

interface ExchangeLine {
  key: string
  fromCurrency: string
  fromAmount: number
  fromRate: number
  toCurrency: string
  toAmount: number
  toRate: number
  amountLak: number
}

// Số tiền ngoại tệ có thể lẻ tới 4 chữ số (vd 872.7273 USD)
const fmtAmt = (n: number) => n.toLocaleString('lo-LA', { maximumFractionDigits: 4 })

/**
 * Dựng các dòng tiền trao đổi.
 * - Phiếu mới: mỗi `items[]` là 1 dòng đổi (fxFrom* → fxTo*).
 * - Phiếu cũ (items rỗng): dựng 1 dòng từ field vô hướng.
 */
function buildLines(tx: Transaction): ExchangeLine[] {
  const fxItems = tx.items.filter(i => i.fxFromCurrency || i.fxToCurrency)
  if (fxItems.length > 0) {
    return fxItems.map((i, idx) => ({
      key: i.id ?? String(idx),
      fromCurrency: i.fxFromCurrency ?? 'LAK',
      fromAmount: i.fxFromAmount ?? 0,
      fromRate: i.fxFromRateToLak ?? 1,
      toCurrency: i.fxToCurrency ?? 'LAK',
      toAmount: i.fxToAmount ?? 0,
      toRate: i.fxToRateToLak ?? 1,
      amountLak: i.lineTotal,
    }))
  }
  if ((tx.foreignAmount ?? 0) > 0) {
    return [{
      key: 'scalar',
      fromCurrency: tx.currency ?? 'LAK',
      fromAmount: tx.foreignAmount ?? 0,
      fromRate: tx.exchangeRate ?? 1,
      toCurrency: tx.targetCurrency ?? 'LAK',
      toAmount: tx.targetAmount ?? tx.totalAmount,
      toRate: (tx.targetCurrency ?? 'LAK') === 'LAK' ? 1 : (tx.targetRateToLak ?? 0),
      amountLak: tx.totalAmount,
    }]
  }
  return []
}

export function CurrencyExchangeDetail({ tx }: { tx: Transaction }) {
  const t = useTranslations('admin.reports.currencyExchange')
  const lines = buildLines(tx)

  const lineColumns: TableColumnsType<ExchangeLine> = [
    {
      title: t('colGave'),
      key: 'gave',
      align: 'right',
      render: (_, r) => (
        <span className="tabular-nums font-medium">{fmtAmt(r.fromAmount)} {r.fromCurrency}</span>
      ),
    },
    {
      title: t('lineRateFrom'),
      dataIndex: 'fromRate',
      key: 'fromRate',
      align: 'right',
      width: 110,
      render: (v: number) => <span className="tabular-nums text-muted-foreground">{fmtAmt(v)}</span>,
    },
    {
      title: '',
      key: 'arrow',
      width: 28,
      align: 'center',
      render: () => <span className="text-muted-foreground">→</span>,
    },
    {
      title: t('colReceived'),
      key: 'received',
      align: 'right',
      render: (_, r) => (
        <span className="tabular-nums font-medium">{fmtAmt(r.toAmount)} {r.toCurrency}</span>
      ),
    },
    {
      title: t('lineRateTo'),
      dataIndex: 'toRate',
      key: 'toRate',
      align: 'right',
      width: 110,
      render: (v: number) => <span className="tabular-nums text-muted-foreground">{fmtAmt(v)}</span>,
    },
    {
      title: t('lineAmountLak'),
      dataIndex: 'amountLak',
      key: 'amountLak',
      align: 'right',
      width: 160,
      render: (v: number) => <span className="tabular-nums">{formatNum(v)} ₭</span>,
    },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-4 space-y-2">
      <p className="text-sm font-semibold">{t('exchangeLinesTitle')}</p>
      <Table<ExchangeLine>
        rowKey="key"
        columns={lineColumns}
        dataSource={lines}
        size="small"
        bordered
        pagination={false}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: t('empty') }}
      />
    </div>
  )
}
