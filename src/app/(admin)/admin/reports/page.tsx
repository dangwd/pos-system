'use client'

import { useState } from 'react'
import { useDashboardReport, useDailyReport } from '@/hooks/useReports'
import { useAuthStore } from '@/stores/auth.store'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function dayRange(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const from = new Date(y, m - 1, d)
  const to = new Date(y, m - 1, d, 23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatKip(n: number | null | undefined) {
  return (n ?? 0).toLocaleString('lo-LA') + ' ₭'
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function StatGridSkeleton({ cols = 3 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-32" />
        </div>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pt-2">
      {children}
    </p>
  )
}

type Tab = 'dashboard' | 'daily'

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const t = useTranslations('admin.reports')
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [date, setDate] = useState(todayIso())

  const range = dayRange(date)

  const { data: dashboard, isLoading: loadingDash } = useDashboardReport(
    tab === 'dashboard' ? range : undefined
  )

  const { data: daily, isLoading: loadingDaily } = useDailyReport(
    { branchId: user?.branchId ?? '', date },
    tab === 'daily',
  )

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* ── Tabs ── */}
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

      {/* ── Date picker (shared) ── */}
      <div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40 h-8 text-sm"
        />
      </div>

      {/* ── Dashboard tab ── */}
      {tab === 'dashboard' && (
        loadingDash ? (
          <StatGridSkeleton cols={3} />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <StatCard label={t('dashboard.totalRevenue')}  value={formatKip(dashboard?.totalRevenue)}  />
              <StatCard label={t('dashboard.totalPurchase')} value={formatKip(dashboard?.totalPurchase)} />
              <StatCard label={t('dashboard.grossProfit')}   value={formatKip((dashboard?.totalRevenue ?? 0) - (dashboard?.totalPurchase ?? 0))} />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <StatCard label={t('dashboard.cancelledCount')} value={dashboard?.cancelledCount ?? 0} />
            </div>
          </div>
        )
      )}

      {/* ── Daily tab ── */}
      {tab === 'daily' && !user?.branchId && (
        <p className="text-muted-foreground text-sm py-8 text-center">—</p>
      )}

      {tab === 'daily' && !!user?.branchId && (
        loadingDaily ? (
          <div className="space-y-4">
            <StatGridSkeleton cols={2} />
            <StatGridSkeleton cols={2} />
            <StatGridSkeleton cols={2} />
          </div>
        ) : daily ? (
          <div className="space-y-5">

            {/* Doanh thu & Lãi/Lỗ */}
            <div>
              <SectionTitle>{t('daily.sections.revenue')}</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <StatCard label={t('daily.doanhThuBan')}    value={formatKip(daily.doanhThuBan)} />
                <StatCard label={t('daily.chiPhiMua')}      value={formatKip(daily.chiPhiMua)} />
                <StatCard label={t('daily.doanhThuDoi')}    value={formatKip(daily.doanhThuDoi)} />
                <StatCard label={t('daily.laiGopTamTinh')}  value={formatKip(daily.laiGopTamTinh)}
                  sub={t('daily.laiGopNote')}
                />
              </div>
            </div>

            {/* Giao dịch */}
            <div>
              <SectionTitle>{t('daily.sections.transactions')}</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <StatCard label={t('daily.tongHoaDon')}         value={daily.tongHoaDon} />
                <StatCard label={t('daily.tongGiaoDichTrade')}  value={daily.tongGiaoDichTrade} />
              </div>
            </div>

            {/* Tồn kho */}
            <div>
              <SectionTitle>{t('daily.sections.inventory')}</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <StatCard label={t('daily.itemsOnDisplay')}  value={daily.tonKho.itemsOnDisplay} />
                <StatCard label={t('daily.totalWeightGram')} value={`${daily.tonKho.totalWeightMg.toLocaleString('lo-LA')} g`} />
              </div>
            </div>

            {/* Tồn quỹ */}
            <div>
              <SectionTitle>{t('daily.sections.cash')}</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <StatCard label={t('daily.openingLak')}   value={formatKip(daily.tonQuy.openingLak)} />
                <StatCard label={t('daily.collectedLak')} value={formatKip(daily.tonQuy.collectedLak)} />
                <StatCard label={t('daily.paidLak')}      value={formatKip(daily.tonQuy.paidLak)} />
                <StatCard label={t('daily.closingLak')}   value={formatKip(daily.tonQuy.closingLak)} />
              </div>
            </div>

          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">—</p>
        )
      )}
    </div>
  )
}
