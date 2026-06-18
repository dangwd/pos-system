'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { REV, PILL, MUTED_ZERO, MINIBAR_TRACK, todayIso } from './revenue-theme'
import { formatCurrency, type CurrencyCode } from '@/lib/currency'
import type { RevenueByDateRow, RevenueSummary } from '@/types/report'

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const w = max > 0 ? Math.round((value / max) * 52) : 0
  return (
    <div className="ml-auto mt-1 h-1 rounded-sm" style={{ width: 52, background: MINIBAR_TRACK }}>
      <div className="h-full rounded-sm" style={{ width: w, background: color }} />
    </div>
  )
}

function MoneyCell({ value, max, color, currency }: {
  value: number; max: number; color: string; currency: CurrencyCode
}) {
  if (!value) return <span style={{ color: MUTED_ZERO }}>—</span>
  return (
    <div className="text-right">
      <span className="tabular-nums" style={{ color }}>{formatCurrency(value, currency)}</span>
      <MiniBar value={value} max={max} color={color} />
    </div>
  )
}

function Pill({ label }: { label: string }) {
  return (
    <span className="ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: PILL.bg, color: PILL.text }}>
      {label}
    </span>
  )
}

export function RevenueTable({
  byDate, summary, currency, loading,
}: {
  byDate: RevenueByDateRow[]; summary: RevenueSummary; currency: CurrencyCode; loading?: boolean
}) {
  const t = useTranslations('admin.reports.revenue')
  const today = todayIso()

  const maxSell = useMemo(() => Math.max(0, ...byDate.map((r) => r.sellTotal)), [byDate])
  const maxBuy = useMemo(() => Math.max(0, ...byDate.map((r) => r.buyTotal)), [byDate])
  const maxExch = useMemo(() => Math.max(0, ...byDate.map((r) => r.exchangeTotal)), [byDate])
  const sumBuy = useMemo(() => byDate.reduce((s, r) => s + r.buyTotal, 0), [byDate])

  const columns: TableColumnsType<RevenueByDateRow> = [
    {
      title: t('colDate'), dataIndex: 'date', key: 'date', width: 160,
      render: (v: string) => (
        <span className="font-medium">
          {dayjs(v).format('DD/MM')}
          {v === today && <Pill label={t('pillToday')} />}
          {sumBuy > 0 && byDate.find((r) => r.date === v)!.buyTotal > sumBuy * 0.5 && <Pill label={t('pillSpike')} />}
        </span>
      ),
    },
    { title: t('cardSell'), dataIndex: 'sellTotal', key: 'sellTotal', align: 'right',
      render: (v: number) => <MoneyCell value={v} max={maxSell} color={REV.sell.text} currency={currency} /> },
    { title: t('cardBuy'), dataIndex: 'buyTotal', key: 'buyTotal', align: 'right',
      render: (v: number) => <MoneyCell value={v} max={maxBuy} color={REV.buy.text} currency={currency} /> },
    { title: t('cardExchange'), dataIndex: 'exchangeTotal', key: 'exchangeTotal', align: 'right',
      render: (v: number) => <MoneyCell value={v} max={maxExch} color={REV.exch.text} currency={currency} /> },
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
        rowClassName={(r) => (r.date === today ? 'rev-today-row' : '')}
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
                <b style={{ color: REV.sell.text }}>{formatCurrency(summary.sellTotal, currency)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right">
                <b style={{ color: REV.buy.text }}>{formatCurrency(summary.buyTotal, currency)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right">
                <b style={{ color: REV.exch.text }}>{formatCurrency(summary.exchangeTotal, currency)}</b>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><b>{summary.invoiceCount}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><b>{summary.tradeCount}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
      <style>{`
        .rev-today-row > td { background: rgba(250,238,218,.25) !important; }
        .rev-total-row > td { background: #f5f5f3; border-top: 1.5px solid #d3d1c7; font-weight: 500; }
      `}</style>
    </div>
  )
}
