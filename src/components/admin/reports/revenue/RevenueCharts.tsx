'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Panel, EmptyHint } from '@/components/admin/reports/report-ui'
import { REV } from './revenue-theme'
import { formatCurrency, compactCurrency, type CurrencyCode } from '@/lib/currency'
import type { RevenueByDateRow, RevenueSummary } from '@/types/report'

const tooltipStyle = { fontSize: 12, borderRadius: 8 }

// BE trả sparse (chỉ ngày có GD) → fill ngày trống = 0 để trục thời gian liên tục.
// Cap 366 ngày: vượt thì giữ nguyên điểm thưa, tránh vẽ quá nhiều cột.
function buildBarData(byDate: RevenueByDateRow[], from: string, to: string) {
  const span = dayjs(to).diff(dayjs(from), 'day')
  const toRow = (r: { date: string; sellTotal: number; buyTotal: number; exchangeTotal: number }) => ({
    label: dayjs(r.date).format('DD/MM'), sell: r.sellTotal, buy: r.buyTotal, exch: r.exchangeTotal,
  })
  if (span < 0 || span > 366) return byDate.map(toRow)

  const map = new Map(byDate.map((r) => [r.date, r]))
  const out: { label: string; sell: number; buy: number; exch: number }[] = []
  for (let d = dayjs(from); !d.isAfter(dayjs(to), 'day'); d = d.add(1, 'day')) {
    const r = map.get(d.format('YYYY-MM-DD'))
    out.push(r ? toRow(r) : { label: d.format('DD/MM'), sell: 0, buy: 0, exch: 0 })
  }
  return out
}

export function RevenueCharts({
  byDate, summary, currency, fromDate, toDate,
}: {
  byDate: RevenueByDateRow[]; summary: RevenueSummary; currency: CurrencyCode
  fromDate: string; toDate: string
}) {
  const t = useTranslations('admin.reports.revenue')

  const barData = useMemo(() => buildBarData(byDate, fromDate, toDate), [byDate, fromDate, toDate])

  const total = summary.sellTotal + summary.buyTotal + summary.exchangeTotal
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
  const donutData = [
    { key: 'sell', name: t('cardSell'), value: summary.sellTotal, color: REV.sell.bar, ...REV.sell },
    { key: 'buy', name: t('cardBuy'), value: summary.buyTotal, color: REV.buy.bar, ...REV.buy },
    { key: 'exch', name: t('cardExchange'), value: summary.exchangeTotal, color: REV.exch.bar, ...REV.exch },
  ]

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {/* Biến động theo ngày */}
      <Panel title={t('chartTrendTitle')} className="lg:col-span-2">
        {barData.length === 0 ? <EmptyHint>{t('empty')}</EmptyHint> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 4, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compactCurrency(Number(v), currency)} />
              <Tooltip
                formatter={(v) => formatCurrency(Number(v), currency)}
                contentStyle={tooltipStyle}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sell" name={t('cardSell')} fill={REV.sell.bar} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="buy" name={t('cardBuy')} fill={REV.buy.bar} radius={[3, 3, 0, 0]} maxBarSize={22} />
              <Bar dataKey="exch" name={t('cardExchange')} fill={REV.exch.bar} radius={[3, 3, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Tỷ trọng trong kỳ */}
      <Panel title={t('chartShareTitle')}>
        {total === 0 ? <EmptyHint>{t('empty')}</EmptyHint> : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" strokeWidth={0}>
                  {donutData.map((d) => <Cell key={d.key} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v), currency)} contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {donutData.map((d) => (
                <div
                  key={d.key}
                  className="flex items-center justify-between rounded px-2 py-1 text-xs"
                  style={{ background: d.bg, color: d.text }}
                >
                  <span>{d.name}</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(d.value, currency)} <span className="opacity-70">({pct(d.value)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}
