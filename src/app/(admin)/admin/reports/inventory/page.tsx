'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Select, Input, DatePicker, Button } from 'antd'
import dayjs from 'dayjs'
import {
  DownloadOutlined, CalendarOutlined, SwapOutlined,
  CheckCircleOutlined, CloseOutlined,
} from '@ant-design/icons'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { EmptyHint, formatNum, formatGram } from '@/components/admin/reports/report-ui'
import { StockPeriodTable } from '@/components/admin/reports/stock-period/StockPeriodTable'
import { useBranches } from '@/hooks/useBranches'
import { useCategories } from '@/hooks/useProducts'
import { useStockPeriodReport } from '@/hooks/useReports'
import { reportsRepository } from '@/lib/repositories/reports.repository'
import { useToast } from '@/lib/toast'

const KARATS = ['9999', '999', '750', '585', '375', '925', '800']
const fmtD = (iso: string) => dayjs(iso).format('DD/MM/YYYY')

// ─── Stat card ────────────────────────────────────────────────────────────────

function PeriodCard({
  icon, iconColor, label, value, sub, highlight, delta,
}: {
  icon: React.ReactNode; iconColor: string; label: string
  value: React.ReactNode; sub: string; highlight?: boolean
  delta?: { value: number; text: string }
}) {
  return (
    <div
      className="rounded-lg border bg-card p-4 space-y-1 shadow-card"
      style={highlight ? { border: '1px solid #B5D4F4' } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color: iconColor }}>{icon}</span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
      {delta && delta.value !== 0 && (
        <span
          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5"
          style={delta.value > 0
            ? { background: '#EAF3DE', color: '#3B6D11' }
            : { background: '#FCEBEB', color: '#A32D2D' }}
        >
          {delta.value > 0 ? '+' : '−'}{formatNum(Math.abs(delta.value))} {delta.text} {delta.value > 0 ? '↑' : '↓'}
        </span>
      )}
    </div>
  )
}

function FilterTag({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border"
      style={{ background: '#E6F1FB', color: '#0C447C', borderColor: '#B5D4F4' }}
    >
      {label}
      <CloseOutlined className="cursor-pointer text-[10px]" onClick={onClear} />
    </span>
  )
}

export default function StockPeriodReportPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.reports.stockPeriod')
  const toast = useToast()

  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'))
  const [toDate, setToDate]     = useState(dayjs().format('YYYY-MM-DD'))
  const [branchId, setBranchId]   = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [karat, setKarat]         = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]       = useState('')
  const [exporting, setExporting] = useState(false)

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: branches = [] } = useBranches()
  const { data: categories = [] } = useCategories()

  const params = {
    fromDate, toDate,
    branchId: branchId ?? undefined,
    categoryId: categoryId ?? undefined,
    karat: karat ?? undefined,
    search: search || undefined,
  }
  const { data, isLoading, isFetching } = useStockPeriodReport(params)

  const branchName = branches.find(b => b.id === branchId)?.name
  const categoryName = categories.find(c => c.id === categoryId)?.name

  const hasFilter = !!(branchId || categoryId || karat || search)
  function clearAll() {
    setBranchId(null); setCategoryId(null); setKarat(null); setSearchInput(''); setSearch('')
  }

  async function handleExport() {
    setExporting(true)
    try {
      await reportsRepository.exportStockPeriod(params)
    } catch {
      toast.error(t('exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  const s = data?.summary
  const deltaClose = s ? s.closeQty - s.openQty : 0

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
          {t('export')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker.RangePicker
          value={[dayjs(fromDate), dayjs(toDate)]}
          onChange={(range) => {
            if (range?.[0] && range?.[1]) {
              setFromDate(range[0].format('YYYY-MM-DD'))
              setToDate(range[1].format('YYYY-MM-DD'))
            }
          }}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <Select
          allowClear showSearch optionFilterProp="label"
          placeholder={t('filterBranch')} style={{ width: 180 }}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          value={branchId} onChange={v => setBranchId(v ?? null)}
        />
        <Select
          allowClear showSearch optionFilterProp="label"
          placeholder={t('filterCategory')} style={{ width: 170 }}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
          value={categoryId} onChange={v => setCategoryId(v ?? null)}
        />
        <Select
          allowClear
          placeholder={t('filterKarat')} style={{ width: 120 }}
          options={KARATS.map(k => ({ value: k, label: k }))}
          value={karat} onChange={v => setKarat(v ?? null)}
        />
        <Input
          allowClear placeholder={t('searchPlaceholder')} style={{ width: 200 }}
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
        />
        {hasFilter && (
          <Button danger onClick={clearAll}>{t('clearFilters')}</Button>
        )}
      </div>

      {/* Active tags */}
      {hasFilter && (
        <div className="flex flex-wrap gap-2">
          {branchId && <FilterTag label={`${t('tagBranch')}: ${branchName ?? branchId}`} onClear={() => setBranchId(null)} />}
          {categoryId && <FilterTag label={`${t('tagCategory')}: ${categoryName ?? categoryId}`} onClear={() => setCategoryId(null)} />}
          {karat && <FilterTag label={`${t('tagKarat')}: ${karat}`} onClear={() => setKarat(null)} />}
          {search && <FilterTag label={`${t('tagSearch')}: ${search}`} onClear={() => { setSearchInput(''); setSearch('') }} />}
        </div>
      )}

      {isLoading ? (
        <TablePageSkeleton cols={6} rows={6} />
      ) : !data ? (
        <EmptyHint>{t('empty')}</EmptyHint>
      ) : (
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3">
            <PeriodCard
              icon={<CalendarOutlined />} iconColor="#185FA5"
              label={t('cardOpen')} value={`${formatNum(s!.openQty)} ${t('unitQty')}`}
              sub={`${formatGram(s!.openWeight)}`}
            />
            <PeriodCard
              icon={<SwapOutlined />} iconColor="#444441"
              label={t('cardChange')} value={`+${formatNum(s!.receiptQty)} / −${formatNum(s!.issueQty)}`}
              sub={t('changeSub', { receipt: formatNum(s!.receiptQty), issue: formatNum(s!.issueQty) })}
            />
            <PeriodCard
              icon={<CheckCircleOutlined />} iconColor="#3B6D11"
              label={t('cardClose')} value={`${formatNum(s!.closeQty)} ${t('unitQty')}`}
              sub={`${formatGram(s!.closeWeight)}`}
              highlight
              delta={{ value: deltaClose, text: t('deltaVsOpen') }}
            />
          </div>

          {/* Result bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('resultCount', { count: data.items.length })}</span>
            <span style={{ color: '#185FA5' }}>{fmtD(fromDate)} → {fmtD(toDate)}</span>
          </div>

          {/* Detail table */}
          <div className="rounded-lg border bg-card p-4 shadow-card">
            <StockPeriodTable items={data.items} fromDate={fromDate} toDate={toDate} loading={isFetching} />
          </div>
        </div>
      )}
    </div>
  )
}
