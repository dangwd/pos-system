'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsRepository } from '@/lib/repositories/reports.repository'
import { useAuthStore } from '@/stores/auth.store'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function formatKip(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('lo-LA') + ' ₭'
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Tab = 'dashboard' | 'daily'

export default function ReportsPage() {
  const t = useTranslations('admin.reports')
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [date, setDate] = useState(today())

  const { data: dashboard, isLoading: loadingDash } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportsRepository.getDashboard(),
    staleTime: 60_000,
    enabled: tab === 'dashboard',
  })

  const { data: daily, isLoading: loadingDaily } = useQuery({
    queryKey: ['reports', 'daily', user?.branchId, date],
    queryFn: () => reportsRepository.getDaily({ branchId: user?.branchId ?? '', date }),
    staleTime: 60_000,
    enabled: tab === 'daily' && !!user?.branchId,
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="flex gap-1.5 border-b pb-0">
        {(['dashboard', 'daily'] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === k
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`${k}.title`)}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        loadingDash ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: t('dashboard.totalRevenue'),      value: formatKip(dashboard?.totalRevenueLak ?? 0) },
                { label: t('dashboard.totalProfit'),       value: formatKip(dashboard?.totalProfitLak ?? 0) },
                { label: t('dashboard.totalTransactions'), value: String(dashboard?.totalTransactions ?? 0) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border bg-card p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            {(dashboard?.topProducts?.length ?? 0) > 0 && (
              <div className="rounded-md border">
                <div className="px-4 py-3 border-b font-semibold text-sm">
                  {t('dashboard.topProducts')}
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-muted-foreground font-medium">{t('dashboard.columns.product')}</th>
                      <th className="px-4 py-2 text-right text-muted-foreground font-medium">{t('dashboard.columns.count')}</th>
                      <th className="px-4 py-2 text-right text-muted-foreground font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.topProducts.map((p) => (
                      <tr key={p.productName} className="border-t hover:bg-muted/20">
                        <td className="px-4 py-2 font-medium">{p.productName}</td>
                        <td className="px-4 py-2 text-right">{p.quantitySold}</td>
                        <td className="px-4 py-2 text-right font-semibold">{formatKip(p.revenueLak)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {tab === 'daily' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 h-8 text-sm"
            />
          </div>

          {loadingDaily ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : daily ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: t('daily.date'),     value: daily.date },
                { label: t('daily.branch'),   value: daily.branchName },
                { label: t('daily.opening'),  value: formatKip(daily.openingBalanceLak) },
                { label: t('daily.revenue'),  value: formatKip(daily.totalRevenueLak) },
                { label: t('daily.purchase'), value: formatKip(daily.totalPurchaseLak) },
                { label: t('daily.closing'),  value: formatKip(daily.closingBalanceLak) },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg border bg-card p-4 space-y-1">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-8 text-center">—</p>
          )}
        </div>
      )}
    </div>
  )
}
