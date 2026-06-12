'use client'

import Link from 'next/link'
import { useDashboardReport } from '@/hooks/useReports'
import { useTransactions } from '@/hooks/useTransactions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, XCircle, BarChart3, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Transaction } from '@/types/transaction'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayRange() {
  const d = new Date()
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
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

function TxRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0">
      <Skeleton className="h-4 w-28 shrink-0" />
      <Skeleton className="h-5 w-20 rounded-full shrink-0" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-5 w-16 rounded-full shrink-0" />
      <Skeleton className="h-4 w-24 shrink-0" />
      <Skeleton className="h-3 w-12 shrink-0" />
    </div>
  )
}

function TxRow({ tx, typeLabel, statusLabel, statusVariant }: {
  tx: Transaction
  typeLabel: string
  statusLabel: string
  statusVariant: 'default' | 'secondary' | 'destructive' | 'outline'
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-0 text-sm hover:bg-muted/30 transition-colors">
      <span className="font-mono text-xs text-muted-foreground w-28 shrink-0 truncate">
        {tx.invoiceCode ?? `#${tx.id.slice(0, 8).toUpperCase()}`}
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLE[tx.type] ?? 'bg-secondary text-secondary-foreground'}`}>
        {typeLabel}
      </span>
      <span className="flex-1 truncate text-xs text-muted-foreground">
        {tx.cashierName}
      </span>
      <Badge variant={statusVariant} className="shrink-0 text-[11px]">{statusLabel}</Badge>
      <span className="font-semibold tabular-nums shrink-0">
        {formatKip(tx.totalAmount ?? 0)}
      </span>
      <span className="text-[11px] text-muted-foreground shrink-0 w-11 text-right">
        {formatTime(tx.transactedAt)}
      </span>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard')
  const tOrders = useTranslations('admin.orders')

  const range = todayRange()
  const { data: stats, isLoading: statsLoading } = useDashboardReport(range)
  const { data: txPage, isLoading: txLoading } = useTransactions({ limit: 10 } as Parameters<typeof useTransactions>[0])

  const transactions: Transaction[] = Array.isArray(txPage)
    ? txPage
    : (txPage as { data?: Transaction[] })?.data ?? []

  const grossProfit = (stats?.totalRevenue ?? 0) - (stats?.totalPurchase ?? 0)

  const typeLabels = tOrders.raw('transactionTypes') as Record<string, string>
  const statusMap = tOrders.raw('transactionStatuses') as Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>

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
          <StatCard label={t('stats.totalRevenue')}  value={formatKip(stats?.totalRevenue ?? 0)}  icon={TrendingUp}   iconClass="text-green-500" />
          <StatCard label={t('stats.totalPurchase')} value={formatKip(stats?.totalPurchase ?? 0)} icon={TrendingDown}  iconClass="text-orange-500" />
          <StatCard label={t('stats.grossProfit')}   value={formatKip(grossProfit)}               icon={BarChart3}    iconClass="text-primary" />
          <StatCard label={t('stats.cancelledCount')}value={stats?.cancelledCount ?? 0}           icon={XCircle}      iconClass="text-destructive" />
        </div>
      )}

      {/* ── Recent transactions ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <CardTitle className="text-sm font-semibold">{t('recentTitle')}</CardTitle>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {t('viewAll')} <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>

        {txLoading ? (
          <div>
            {[0, 1, 2, 3, 4].map((i) => <TxRowSkeleton key={i} />)}
          </div>
        ) : transactions.length === 0 ? (
          <CardContent>
            <p className="text-center py-8 text-muted-foreground text-sm">{t('empty')}</p>
          </CardContent>
        ) : (
          <div>
            {transactions.slice(0, 10).map((tx) => {
              const statusInfo = statusMap?.[tx.status]
              return (
                <TxRow
                  key={tx.id}
                  tx={tx}
                  typeLabel={typeLabels?.[tx.type] ?? tx.type}
                  statusLabel={statusInfo?.label ?? tx.status}
                  statusVariant={statusInfo?.variant ?? 'secondary'}
                />
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
