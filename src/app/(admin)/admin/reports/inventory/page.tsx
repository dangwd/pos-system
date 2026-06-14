'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, Input } from 'antd'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Badge } from '@/components/ui/badge'
import { StatCard, Panel, EmptyHint, CHART_COLORS, formatGram, formatNum, compactKip } from '@/components/admin/reports/report-ui'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useInventoryReport } from '@/hooks/useReports'
import type { TableColumnsType } from 'antd'
import type { InventoryStatus } from '@/types/inventory'
import type { InventoryReportCategoryRow, InventoryReportItem } from '@/types/report'

const PAGE_SIZE = 20

export default function InventoryReportPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.reports.inventory')
  const tInv = useTranslations('admin.inventory')

  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(branchId)

  // Reset trang khi filter đổi
  const [prevFilters, setPrevFilters] = useState({ branchId, counterId, keyword })
  const curFilters = { branchId, counterId, keyword }
  if (JSON.stringify(curFilters) !== JSON.stringify(prevFilters)) {
    setPrevFilters(curFilters)
    setPage(1)
  }

  const { data, isLoading, isFetching } = useInventoryReport({
    branchId: branchId ?? undefined,
    counterId: counterId ?? undefined,
    keyword: keyword.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const statusLabels = useMemo<Record<InventoryStatus, string>>(() => ({
    TiepNhan: tInv('statusTiepNhan'), DaDinhGia: tInv('statusDaDinhGia'),
    TrenQuay: tInv('statusTrenQuay'), ChuyenXuong: tInv('statusChuyenXuong'),
    DaBan: tInv('statusDaBan'), DoiRa: tInv('statusDoiRa'),
  }), [tInv])

  const sourceLabel = (s: string | null) =>
    s === 'Quan' ? tInv('sourceQuan') : s === 'Ngoai' ? tInv('sourceNgoai') : '—'

  const categoryData = useMemo(
    () => (data?.byCategory ?? []).map((r, i) => ({ name: r.category, value: r.totalWeightGram, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [data],
  )
  const statusData = useMemo(
    () => (data?.byStatus ?? []).map((r, i) => ({ name: statusLabels[r.trangThai] ?? r.trangThai, value: r.itemCount, fill: CHART_COLORS[i % CHART_COLORS.length] })),
    [data, statusLabels],
  )
  const nguonGocData = useMemo(
    () => (data?.byNguonGoc ?? []).map((r) => ({
      name: sourceLabel(r.nguonGoc),
      value: r.itemCount,
      fill: r.nguonGoc === 'Quan' ? CHART_COLORS[0] : CHART_COLORS[2],
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, tInv],
  )

  const categoryColumns: TableColumnsType<InventoryReportCategoryRow> = [
    { title: t('colCategory'), dataIndex: 'category', key: 'category', render: (v: string) => <span className="font-medium">{v}</span> },
    { title: t('colCount'), dataIndex: 'itemCount', key: 'itemCount', align: 'right', render: (v: number) => formatNum(v) },
    { title: t('colQuantity'), dataIndex: 'totalQuantity', key: 'totalQuantity', align: 'right', render: (v: number) => formatNum(v) },
    { title: t('colWeight'), dataIndex: 'totalWeightGram', key: 'totalWeightGram', align: 'right', render: (v: number) => formatGram(v) },
  ]

  const itemColumns: TableColumnsType<InventoryReportItem> = [
    { title: tInv('columns.productCode'), dataIndex: 'productCode', key: 'productCode', render: (v: string) => <span className="font-mono text-xs text-muted-foreground">{v}</span> },
    { title: tInv('columns.productName'), dataIndex: 'productName', key: 'productName', render: (v: string) => <span className="font-medium">{v}</span> },
    { title: t('colCategory'), dataIndex: 'category', key: 'category' },
    { title: tInv('columns.purity'), dataIndex: 'purity', key: 'purity', render: (v: string | null) => v ?? '—' },
    { title: tInv('columns.counter'), dataIndex: 'counterName', key: 'counterName' },
    { title: tInv('columns.qty'), dataIndex: 'quantity', key: 'quantity', align: 'right', render: (v: number) => formatNum(v) },
    { title: tInv('columns.weight'), dataIndex: 'weightGram', key: 'weightGram', align: 'right', render: (v: number) => formatGram(v) },
    { title: tInv('columns.source'), dataIndex: 'nguonGoc', key: 'nguonGoc', render: (v: string | null) => <Badge variant="outline" className="text-[10px]">{sourceLabel(v)}</Badge> },
  ]

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          allowClear showSearch optionFilterProp="label"
          placeholder={t('filterBranch')} style={{ width: 190 }}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          value={branchId} onChange={v => { setBranchId(v ?? null); setCounterId(null) }}
        />
        <Select
          allowClear showSearch optionFilterProp="label"
          placeholder={t('filterCounter')} style={{ width: 170 }}
          disabled={!branchId}
          options={counters.map(c => ({ value: c.id, label: c.counterName }))}
          value={counterId} onChange={v => setCounterId(v ?? null)}
        />
        <Input.Search
          allowClear placeholder={tInv('filterKeyword')} style={{ width: 220 }}
          onSearch={v => setKeyword(v)}
          onChange={e => { if (!e.target.value) setKeyword('') }}
        />
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={4} rows={6} />
      ) : !data ? (
        <EmptyHint>—</EmptyHint>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label={t('totalItems')} value={formatNum(data.totalItems)} />
            <StatCard label={t('totalQuantity')} value={formatNum(data.totalQuantity)} />
            <StatCard label={t('totalWeight')} value={formatGram(data.totalWeightGram)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* By category */}
            <Panel title={t('byCategory')} className="lg:col-span-2">
              {categoryData.length === 0 ? <EmptyHint>—</EmptyHint> : (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(160, categoryData.length * 38)}>
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tickFormatter={compactKip} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => formatGram(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {categoryData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <DataTable columns={categoryColumns} data={data.byCategory} rowKey="category" hideSearch maxHeight={false} pageSize={50} />
                </>
              )}
            </Panel>

            {/* By status */}
            <Panel title={t('byStatus')}>
              {statusData.length === 0 ? <EmptyHint>—</EmptyHint> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="45%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatNum(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>
          </div>

          {/* By nguon goc */}
          <Panel title={t('byNguonGoc')}>
            {nguonGocData.length === 0 ? <EmptyHint>—</EmptyHint> : (
              <div className="flex flex-wrap items-center gap-6">
                <ResponsiveContainer width={220} height={180}>
                  <PieChart>
                    <Pie data={nguonGocData} cx="50%" cy="50%" outerRadius={70} dataKey="value" paddingAngle={2}>
                      {nguonGocData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatNum(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3">
                  {(data.byNguonGoc ?? []).map((r) => (
                    <div key={r.nguonGoc} className="rounded-lg border bg-card px-4 py-3 min-w-44 space-y-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{sourceLabel(r.nguonGoc)}</p>
                      <p className="text-lg font-bold tabular-nums">{formatNum(r.itemCount)}</p>
                      <p className="text-[11px] text-muted-foreground">{formatNum(r.totalQuantity)} · {formatGram(r.totalWeightGram)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Item list */}
          <Panel title={t('listTitle')}>
            <DataTable
              columns={itemColumns}
              data={data.items.data}
              rowKey="id"
              hideSearch
              loading={isFetching}
              serverPagination={{
                total: data.items.pagination.totalItems,
                page: data.items.pagination.page,
                pageSize: data.items.pagination.pageSize,
                onPageChange: setPage,
              }}
            />
          </Panel>
        </div>
      )}
    </div>
  )
}
