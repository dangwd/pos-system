'use client'

import { useDashboardReport } from '@/hooks/useReports'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, XCircle, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import type { Transaction } from '@/types/transaction'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayRange() {
  const d = new Date()
  return {
    from: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
    to:   new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString(),
  }
}

function formatKip(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

function fmtAxisKip(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(0) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

const TYPE_COLORS: Record<string, string> = {
  SellGold:        '#22c55e',
  SellSilver:      '#14b8a6',
  BuyGold:         '#3b82f6',
  ExchangeGold:    '#f59e0b',
  ExchangeCurrency:'#8b5cf6',
  BuyMoreGold:     '#0ea5e9',
  ExchangeFree:    '#d97706',
  ExchangeToMoney: '#6366f1',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, iconClass,
}: {
  label: string; value: string | number; icon: React.ElementType; iconClass: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${iconClass}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function StatSkeleton() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-4" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2 px-2" style={{ height }}>
      {[60, 90, 40, 75, 55, 85, 45, 70].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

// ── Chart 1: Tài chính tổng quan ─────────────────────────────────────────────

function FinancialOverviewChart({
  revenue, purchase, profit, loading,
}: {
  revenue: number; purchase: number; profit: number; loading: boolean
}) {
  const data = [
    { name: 'Doanh thu',  value: revenue,  fill: '#22c55e' },
    { name: 'Chi mua vào', value: purchase, fill: '#f97316' },
    { name: 'Lãi gộp',    value: profit,   fill: '#6366f1' },
  ]

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Tài chính hôm nay</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {loading ? (
          <ChartSkeleton height={220} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisKip} tick={{ fontSize: 11 }} width={52} />
              <Tooltip
                formatter={(v) => [formatKip(v as number), '']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Chart 2: Cơ cấu loại giao dịch (Donut) ───────────────────────────────────

function TypeDistributionChart({
  transactions, typeLabels, loading,
}: {
  transactions: Transaction[]; typeLabels: Record<string, string>; loading: boolean
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
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Cơ cấu giao dịch</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 220 }}>
            <Skeleton className="h-36 w-36 rounded-full" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-55 text-sm text-muted-foreground">
            Chưa có dữ liệu
          </div>
        ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  dataKey="value"
                  paddingAngle={2}
                >
                  {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`${v} GD`, name as string]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  iconType="circle" iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: -20 }}>
              <p className="text-2xl font-bold tabular-nums leading-none">{total}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">giao dịch</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Chart 3: Doanh thu theo loại giao dịch ────────────────────────────────────

function RevenueByTypeChart({
  transactions, typeLabels, loading,
}: {
  transactions: Transaction[]; typeLabels: Record<string, string>; loading: boolean
}) {
  const revenue = transactions
    .filter(tx => tx.status === 'Completed')
    .reduce((acc, tx) => {
      acc[tx.type] = (acc[tx.type] ?? 0) + (tx.totalAmount ?? 0)
      return acc
    }, {} as Record<string, number>)

  const data = Object.entries(revenue)
    .map(([type, amount]) => ({
      name:   typeLabels?.[type] ?? type,
      value:  amount,
      fill:   TYPE_COLORS[type] ?? '#94a3b8',
    }))
    .sort((a, b) => b.value - a.value)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Doanh thu theo loại giao dịch</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <ChartSkeleton height={200} />
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-50 text-sm text-muted-foreground">
            Chưa có dữ liệu
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" tickFormatter={fmtAxisKip} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v) => [formatKip(v as number), 'Doanh thu']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const t       = useTranslations('admin.dashboard')
  const tOrders = useTranslations('admin.orders')

  const range = todayRange()
  const { data: stats, isLoading: statsLoading } = useDashboardReport(range)
  const { data: txPage, isLoading: txLoading }   = useTransactions({ ...range, limit: 50 } as Parameters<typeof useTransactions>[0])

  const transactions: Transaction[] = Array.isArray(txPage)
    ? txPage
    : (txPage as { data?: Transaction[] })?.data ?? []

  const grossProfit = (stats?.totalRevenue ?? 0) - (stats?.totalPurchase ?? 0)

  const typeLabels = tOrders.raw('transactionTypes') as Record<string, string>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {/* ── Stat cards ── */}
      {statsLoading ? (
        <StatSkeleton />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label={t('stats.totalRevenue')}   value={formatKip(stats?.totalRevenue ?? 0)}  icon={TrendingUp}  iconClass="text-green-500" />
          <StatCard label={t('stats.totalPurchase')}  value={formatKip(stats?.totalPurchase ?? 0)} icon={TrendingDown} iconClass="text-orange-500" />
          <StatCard label={t('stats.grossProfit')}    value={formatKip(grossProfit)}               icon={BarChart3}   iconClass="text-primary" />
          <StatCard label={t('stats.cancelledCount')} value={stats?.cancelledCount ?? 0}           icon={XCircle}     iconClass="text-destructive" />
        </div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <FinancialOverviewChart
            revenue={stats?.totalRevenue ?? 0}
            purchase={stats?.totalPurchase ?? 0}
            profit={grossProfit}
            loading={statsLoading}
          />
        </div>
        <div className="lg:col-span-2">
          <TypeDistributionChart
            transactions={transactions}
            typeLabels={typeLabels}
            loading={txLoading}
          />
        </div>
      </div>

      {/* ── Revenue by type ── */}
      <RevenueByTypeChart
        transactions={transactions}
        typeLabels={typeLabels}
        loading={txLoading}
      />
    </div>
  )
}
