'use client'

import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { MUTED_ZERO } from './revenue-theme'
import { formatCurrency, type CurrencyCode } from '@/lib/currency'
import type { RevenueByDateRow, RevenueSummary } from '@/types/report'

function MoneyCell({ value, currency }: {
  value: number; currency: CurrencyCode
}) {
  if (!value) return <span style={{ color: MUTED_ZERO }}>—</span>
  return <span className="tabular-nums">{formatCurrency(value, currency)}</span>
}

export function RevenueTable({
  byDate, summary, currency, loading,
}: {
  byDate: RevenueByDateRow[]; summary: RevenueSummary; currency: CurrencyCode; loading?: boolean
}) {
  const t = useTranslations('admin.reports.revenue')

  const columns: TableColumnsType<RevenueByDateRow> = [
    {
      title: t('colDate'), dataIndex: 'date', key: 'date', width: 130,
      render: (v: string) => (
        <span className="font-medium">{dayjs(v).format('DD/MM/YYYY')}</span>
      ),
    },
    { title: t('cardSell'), dataIndex: 'sellTotal', key: 'sellTotal', align: 'right',
      render: (v: number) => <MoneyCell value={v} currency={currency} /> },
    { title: t('cardBuy'), dataIndex: 'buyTotal', key: 'buyTotal', align: 'right',
      render: (v: number) => <MoneyCell value={v} currency={currency} /> },
    { title: t('cardExchange'), dataIndex: 'exchangeTotal', key: 'exchangeTotal', align: 'right',
      render: (v: number) => <MoneyCell value={v} currency={currency} /> },
    { title: t('colInvoiceCount'), dataIndex: 'invoiceCount', key: 'invoiceCount', align: 'right', width: 90,
      render: (v: number) => v || <span style={{ color: MUTED_ZERO }}>—</span> },
    { title: t('colTradeCount'), dataIndex: 'tradeCount', key: 'tradeCount', align: 'right', width: 90,
      render: (v: number) => v || <span style={{ color: MUTED_ZERO }}>—</span> },
  ]

  return (
    <div className="rounded-lg border bg-card p-4 shadow-card">
      <Table<RevenueByDateRow>
        rowKey="date"
        columns={columns}
        dataSource={byDate}
        loading={loading}
        size="small"
        locale={{ emptyText: t('empty') }}
        pagination={{
          defaultPageSize: 50,
          pageSizeOptions: ['20', '50', '100'],
          showSizeChanger: true,
          showTotal: (tot) => t('resultCount', { count: tot }),
        }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row className="rev-total-row">
              <Table.Summary.Cell index={0}><b>{t('totalRow')}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <b>{formatCurrency(summary.sellTotal, currency)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <b>{formatCurrency(summary.buyTotal, currency)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <b>{formatCurrency(summary.exchangeTotal, currency)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><b>{summary.invoiceCount}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><b>{summary.tradeCount}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
      <style>{`.rev-total-row > td { background: #f5f5f3; border-top: 1.5px solid #d3d1c7; font-weight: 500; }`}</style>
    </div>
  )
}
