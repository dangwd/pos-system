'use client'

import { useDashboardReport } from '@/hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, XCircle, BarChart3 } from 'lucide-react'
import { useTranslations } from 'next-intl'

function todayRange() {
  const d = new Date()
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  iconClass: string
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

function DashboardSkeleton() {
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

export default function DashboardPage() {
  const t = useTranslations('admin.dashboard')
  const range = todayRange()
  const { data, isLoading } = useDashboardReport(range)

  const grossProfit = (data?.totalRevenue ?? 0) - (data?.totalPurchase ?? 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label={t('stats.totalRevenue')}
            value={formatKip(data?.totalRevenue ?? 0)}
            icon={TrendingUp}
            iconClass="text-green-500"
          />
          <StatCard
            label={t('stats.totalPurchase')}
            value={formatKip(data?.totalPurchase ?? 0)}
            icon={TrendingDown}
            iconClass="text-orange-500"
          />
          <StatCard
            label={t('stats.grossProfit')}
            value={formatKip(grossProfit)}
            icon={BarChart3}
            iconClass="text-primary"
          />
          <StatCard
            label={t('stats.cancelledCount')}
            value={data?.cancelledCount ?? 0}
            icon={XCircle}
            iconClass="text-destructive"
          />
        </div>
      )}
    </div>
  )
}
