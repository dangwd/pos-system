'use client'

import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { formatNum } from '@/components/admin/reports/report-ui'
import type { CurrencyExchangeTx, CurrencyExchangeLeg } from '@/types/report'

// Số tiền ngoại tệ có thể lẻ tới 4 chữ số (vd 872.7273 USD)
const fmtAmt = (n: number) => n.toLocaleString('lo-LA', { maximumFractionDigits: 4 })

export function CurrencyExchangeDetail({ tx }: { tx: CurrencyExchangeTx }) {
  const t = useTranslations('admin.reports.currencyExchange')
  const lines = tx.legs ?? []

  const lineColumns: TableColumnsType<CurrencyExchangeLeg> = [
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
      dataIndex: 'fromRateToLak',
      key: 'fromRateToLak',
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
      dataIndex: 'toRateToLak',
      key: 'toRateToLak',
      align: 'right',
      width: 110,
      render: (v: number) => <span className="tabular-nums text-muted-foreground">{fmtAmt(v)}</span>,
    },
    {
      title: t('lineAmountLak'),
      dataIndex: 'lakEquivalent',
      key: 'lakEquivalent',
      align: 'right',
      width: 160,
      render: (v: number) => <span className="tabular-nums">{formatNum(v)} ₭</span>,
    },
  ]

  return (
    <div className="rounded-md border bg-muted/30 p-4 space-y-2">
      <p className="text-sm font-semibold">{t('exchangeLinesTitle')}</p>
      <Table<CurrencyExchangeLeg>
        rowKey={(_, idx) => String(idx)}
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
