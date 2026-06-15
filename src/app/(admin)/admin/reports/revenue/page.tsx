'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, Segmented, DatePicker } from 'antd'
import dayjs from 'dayjs'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { StatCard, Panel, EmptyHint, formatKip, formatNum, compactKip } from '@/components/admin/reports/report-ui'
import { useBranches } from '@/hooks/useBranches'
import { useRevenueReport } from '@/hooks/useReports'
import { useAuthStore } from '@/stores/auth.store'
import type { TableColumnsType } from 'antd'
import type { RevenuePeriod, RevenueBreakdownRow } from '@/types/report'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const SERIES = { ban: '#22c55e', mua: '#ef4444', doi: '#f59e0b', lai: '#6366f1' }

export default function RevenueReportPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.reports.revenue')
  const user = useAuthStore(s => s.user)

  const [branchId, setBranchId] = useState<string | null>(null)
  const [period, setPeriod] = useState<RevenuePeriod>('month')
  const [date, setDate] = useState(todayIso())

  const { data: branches = [] } = useBranches()
  const effectiveBranchId = branchId ?? user?.branchId ?? branches[0]?.id ?? null

  const { data, isLoading } = useRevenueReport(
    { branchId: effectiveBranchId ?? '', period, date },
    !!effectiveBranchId,
  )

  const pickerMode = period === 'year' ? 'year' : period === 'month' ? 'month' : 'date'
  const dateFormat = period === 'year' ? 'YYYY' : period === 'month' ? 'MM/YYYY' : 'DD/MM/YYYY'

  const columns: TableColumnsType<RevenueBreakdownRow> = [
    { title: t('colLabel'), dataIndex: 'label', key: 'label', render: (v: string) => <span className="font-medium">{v}</span> },
    { title: t('colDoanhThuBan'), dataIndex: 'doanhThuBan', key: 'doanhThuBan', align: 'right', render: (v: number) => formatKip(v) },
    { title: t('colChiPhiMua'), dataIndex: 'chiPhiMua', key: 'chiPhiMua', align: 'right', render: (v: number) => formatKip(v) },
    { title: t('colDoanhThuDoi'), dataIndex: 'doanhThuDoi', key: 'doanhThuDoi', align: 'right', render: (v: number) => formatKip(v) },
    { title: t('colLaiGop'), dataIndex: 'laiGop', key: 'laiGop', align: 'right', render: (v: number) => <b className="tabular-nums">{formatKip(v)}</b> },
    { title: t('colSoHoaDon'), dataIndex: 'soHoaDon', key: 'soHoaDon', align: 'right', render: (v: number) => formatNum(v) },
    { title: t('colSoGiaoDichTrade'), dataIndex: 'soGiaoDichTrade', key: 'soGiaoDichTrade', align: 'right', render: (v: number) => formatNum(v) },
  ]

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {data ? `${data.periodLabel}` : t('subtitle')}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          showSearch optionFilterProp="label"
          placeholder={t('filterBranch')} style={{ width: 200 }}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          value={effectiveBranchId} onChange={v => setBranchId(v)}
        />
        <Segmented<RevenuePeriod>
          value={period}
          onChange={v => setPeriod(v)}
          options={[
            { label: t('periodWeek'), value: 'week' },
            { label: t('periodMonth'), value: 'month' },
            { label: t('periodYear'), value: 'year' },
          ]}
        />
        <DatePicker
          picker={pickerMode}
          value={date ? dayjs(date) : null}
          onChange={d => setDate(d ? d.format('YYYY-MM-DD') : todayIso())}
          format={dateFormat}
          allowClear={false}
          className="h-8"
        />
      </div>

      {!effectiveBranchId ? (
        <EmptyHint>{t('noBranch')}</EmptyHint>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3"><TablePageSkeleton cols={3} rows={2} /></div>
        </div>
      ) : !data ? (
        <EmptyHint>—</EmptyHint>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t('totalDoanhThuBan')} value={formatKip(data.totalDoanhThuBan)} />
            <StatCard label={t('totalChiPhiMua')} value={formatKip(data.totalChiPhiMua)} />
            <StatCard label={t('totalDoanhThuDoi')} value={formatKip(data.totalDoanhThuDoi)} />
            <StatCard label={t('totalLaiGop')} value={formatKip(data.totalLaiGop)} sub={t('laiGopNote')} />
            <StatCard label={t('totalHoaDon')} value={formatNum(data.totalHoaDon)} />
            <StatCard label={t('totalGiaoDichTrade')} value={formatNum(data.totalGiaoDichTrade)} />
          </div>

          {/* Chart */}
          <Panel title={t('chartTitle')}>
            {data.breakdown.length === 0 ? <EmptyHint>—</EmptyHint> : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data.breakdown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={compactKip} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatKip(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar name={t('colDoanhThuBan')} dataKey="doanhThuBan" fill={SERIES.ban} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar name={t('colChiPhiMua')} dataKey="chiPhiMua" fill={SERIES.mua} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar name={t('colDoanhThuDoi')} dataKey="doanhThuDoi" fill={SERIES.doi} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Line name={t('colLaiGop')} type="monotone" dataKey="laiGop" stroke={SERIES.lai} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Panel>

          {/* Table */}
          <Panel title={t('tableTitle')}>
            <DataTable columns={columns} data={data.breakdown} rowKey="label" hideSearch maxHeight={false} pageSize={50} />
          </Panel>
        </div>
      )}
    </div>
  )
}
