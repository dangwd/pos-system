'use client'

import { useState } from 'react'
import { useDashboardReport } from '@/hooks/useReports'
import { useTransactions } from '@/hooks/useTransactions'
import { Skeleton } from '@/components/ui/skeleton'
import { RiseOutlined, FallOutlined, CloseCircleOutlined, BarChartOutlined } from '@ant-design/icons'
import { useTranslations } from 'next-intl'
import { Card, DatePicker } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import type { Transaction } from '@/types/transaction'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { StatCard } from '@/components/admin/shared/StatCard'

const { RangePicker } = DatePicker

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_STYLE: React.CSSProperties  = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties  = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
  overflow: 'hidden',
}
const CHART_HEAD: React.CSSProperties  = {
  padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#111827',
  minHeight: 'auto',
}
const CHART_BODY: React.CSSProperties  = { padding: '8px 16px 16px' }

const TYPE_COLORS: Record<string, string> = {
  SellGold:         '#22c55e',
  SellSilver:       '#14b8a6',
  BuyGold:          '#3b82f6',
  ExchangeGold:     '#f59e0b',
  ExchangeCurrency: '#8b5cf6',
  BuyMoreGold:      '#0ea5e9',
  ExchangeFree:     '#d97706',
  ExchangeToMoney:  '#6366f1',
}

// ── Helpers ───────────────────────────────────────────────────────────────────


function formatKip(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

function fmtAxisKip(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 8px', height }}>
      {[60, 90, 40, 75, 55, 85, 45, 70].map((h, i) => (
        <Skeleton key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4 }} />
      ))}
    </div>
  )
}

function StatSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} style={CARD_STYLE} styles={{ body: { padding: '16px 20px 20px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <Skeleton style={{ height: 12, width: 100, borderRadius: 4 }} />
            <Skeleton style={{ height: 14, width: 14, borderRadius: 4 }} />
          </div>
          <Skeleton style={{ height: 28, width: 140, borderRadius: 4 }} />
        </Card>
      ))}
    </div>
  )
}

// ── Chart 1: Tài chính tổng quan ─────────────────────────────────────────────

function FinancialOverviewChart({
  revenue, purchase, profit, loading, labels,
}: {
  revenue: number; purchase: number; profit: number; loading: boolean
  labels: { revenue: string; purchase: string; profit: string }
}) {
  const data = [
    { name: labels.revenue,  value: revenue,  fill: '#22c55e' },
    { name: labels.purchase, value: purchase, fill: '#f97316' },
    { name: labels.profit,   value: profit,   fill: '#6366f1' },
  ]

  return (
    <Card
      style={CARD_STYLE}
      styles={{ header: CHART_HEAD, body: CHART_BODY }}
      title={labels.revenue.replace('Doanh thu', '') || labels.revenue}
    >
      {loading ? (
        <ChartSkeleton height={230} />
      ) : (
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtAxisKip} tick={{ fontSize: 11 }} width={56} />
            <Tooltip
              formatter={(v) => [formatKip(v as number), '']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── Chart 2: Cơ cấu loại giao dịch ───────────────────────────────────────────

function TypeDistributionChart({
  transactions, typeLabels, loading, noDataLabel, unitLabel, chartTitle,
}: {
  transactions: Transaction[]; typeLabels: Record<string, string>
  loading: boolean; noDataLabel: string; unitLabel: string; chartTitle: string
}) {
  const counts = transactions
    .filter(tx => tx.status === 'Completed')
    .reduce((acc, tx) => { acc[tx.type] = (acc[tx.type] ?? 0) + 1; return acc }, {} as Record<string, number>)

  const data = Object.entries(counts).map(([type, count]) => ({
    name:  typeLabels?.[type] ?? type,
    value: count,
    fill:  TYPE_COLORS[type] ?? '#94a3b8',
  }))

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card style={CARD_STYLE} styles={{ header: CHART_HEAD, body: CHART_BODY }} title={chartTitle}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 230 }}>
          <Skeleton style={{ height: 144, width: 144, borderRadius: '50%' }} />
        </div>
      ) : data.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 230, fontSize: 13, color: '#9ca3af' }}>
          {noDataLabel}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="44%"
                innerRadius={60} outerRadius={88}
                dataKey="value"
                paddingAngle={2}
              >
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
              <Tooltip
                formatter={(v, name) => [`${v} ${unitLabel}`, name as string]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend
                iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 40,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{total}</span>
            <span style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{unitLabel}</span>
          </div>
        </div>
      )}
    </Card>
  )
}

// ── Chart 3: Doanh thu theo loại giao dịch ────────────────────────────────────

function RevenueByTypeChart({
  transactions, typeLabels, loading, noDataLabel, chartTitle,
}: {
  transactions: Transaction[]; typeLabels: Record<string, string>
  loading: boolean; noDataLabel: string; chartTitle: string
}) {
  const revenue = transactions
    .filter(tx => tx.status === 'Completed')
    .reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] ?? 0) + (tx.totalAmount ?? 0)
      return acc
    }, {} as Record<string, number>)

  const data = Object.entries(revenue)
    .map(([type, amount]) => ({
      name:  typeLabels?.[type] ?? type,
      value: amount,
      fill:  TYPE_COLORS[type] ?? '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <Card style={CARD_STYLE} styles={{ header: CHART_HEAD, body: CHART_BODY }} title={chartTitle}>
      {loading ? (
        <ChartSkeleton height={200} />
      ) : data.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, fontSize: 13, color: '#9ca3af' }}>
          {noDataLabel}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
            <XAxis type="number" tickFormatter={fmtAxisKip} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v) => [formatKip(v as number), '']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Hôm nay',    value: [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'Hôm qua',   value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
  { label: 'Tuần này',   value: [dayjs().startOf('week'), dayjs().endOf('week')] },
  { label: 'Tháng này',  value: [dayjs().startOf('month'), dayjs().endOf('month')] },
]

export default function DashboardPage() {
  const { hasPermission } = usePermission()
  const t       = useTranslations('admin.dashboard')
  const tOrders = useTranslations('admin.orders')

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('day'),
    dayjs().endOf('day'),
  ])

  const range = {
    from: dateRange[0].toISOString(),
    to:   dateRange[1].toISOString(),
  }

  const { data: stats, isLoading: statsLoading } = useDashboardReport(range)
  const { data: txPage, isLoading: txLoading }   = useTransactions({ ...range, limit: 50 } as Parameters<typeof useTransactions>[0])

  const transactions: Transaction[] = Array.isArray(txPage)
    ? txPage
    : (txPage as { data?: Transaction[] })?.data ?? []

  const grossProfit  = (stats?.totalRevenue ?? 0) - (stats?.totalPurchase ?? 0)
  const typeLabels   = tOrders.raw('transactionTypes') as Record<string, string>
  const noDataLabel  = t('charts.noData')

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  return (
    <div style={PAGE_STYLE}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle')}
          </p>
        </div>
        <RangePicker
          value={dateRange}
          onChange={(vals) => { if (vals?.[0] && vals?.[1]) setDateRange([vals[0], vals[1]]) }}
          presets={PRESETS}
          format="DD/MM/YYYY"
          allowClear={false}
          style={{ fontSize: 13 }}
        />
      </div>

      {/* ── Stat cards ── */}
      {statsLoading ? (
        <StatSkeleton />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
          <StatCard label={t('stats.totalRevenue')}   value={formatKip(stats?.totalRevenue ?? 0)}  icon={<RiseOutlined />}         iconColor="#22c55e" />
          <StatCard label={t('stats.totalPurchase')}  value={formatKip(stats?.totalPurchase ?? 0)} icon={<FallOutlined />}         iconColor="#f97316" />
          <StatCard label={t('stats.grossProfit')}    value={formatKip(grossProfit)}               icon={<BarChartOutlined />}     iconColor="#6366f1" />
          <StatCard label={t('stats.cancelledCount')} value={stats?.cancelledCount ?? 0}           icon={<CloseCircleOutlined />}  iconColor="#ef4444" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 16 }}>
        <FinancialOverviewChart
          revenue={stats?.totalRevenue ?? 0}
          purchase={stats?.totalPurchase ?? 0}
          profit={grossProfit}
          loading={statsLoading}
          labels={{
            revenue:  t('charts.labelRevenue'),
            purchase: t('charts.labelPurchase'),
            profit:   t('charts.labelProfit'),
          }}
        />
        <TypeDistributionChart
          transactions={transactions}
          typeLabels={typeLabels}
          loading={txLoading}
          noDataLabel={noDataLabel}
          unitLabel={t('charts.unitTransaction')}
          chartTitle={t('charts.typeDistribution')}
        />
      </div>

      {/* ── Revenue by type ── */}
      <RevenueByTypeChart
        transactions={transactions}
        typeLabels={typeLabels}
        loading={txLoading}
        noDataLabel={noDataLabel}
        chartTitle={t('charts.revenueByType')}
      />
    </div>
  )
}
