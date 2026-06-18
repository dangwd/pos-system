'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, Button, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { DownloadOutlined, CloseOutlined } from '@ant-design/icons'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { EmptyHint } from '@/components/admin/reports/report-ui'
import { RevenueStatCards } from '@/components/admin/reports/revenue/RevenueStatCards'
import { RevenueCharts } from '@/components/admin/reports/revenue/RevenueCharts'
import { RevenueTable } from '@/components/admin/reports/revenue/RevenueTable'
import { FILTER_DIVIDER, todayIso } from '@/components/admin/reports/revenue/revenue-theme'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useRevenueReport } from '@/hooks/useReports'
import { reportsRepository } from '@/lib/repositories/reports.repository'
import { useToast } from '@/lib/toast'
import { CURRENCY_CODES, CURRENCIES, type CurrencyCode } from '@/lib/currency'

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

export default function RevenueReportPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.reports.revenue')
  const toast = useToast()

  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState(todayIso())
  const [toDate, setToDate] = useState(todayIso())
  const [currency, setCurrency] = useState<CurrencyCode>('KIP')
  const [exporting, setExporting] = useState(false)

  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(branchId)

  // Đổi chi nhánh → reset quầy (cùng lúc, tránh setState trong effect)
  function changeBranch(v: string | null) {
    setBranchId(v)
    setCounterId(null)
  }

  const params = {
    fromDate, toDate,
    branchId: branchId ?? undefined,
    counterId: counterId ?? undefined,
  }
  const { data, isLoading, isFetching } = useRevenueReport(params)

  const hasFilter = !!(branchId || counterId || fromDate !== todayIso() || toDate !== todayIso())
  function clearAll() {
    setBranchId(null); setCounterId(null)
    setFromDate(todayIso()); setToDate(todayIso())
    setCurrency('KIP')
  }

  async function handleExport() {
    setExporting(true)
    try {
      await reportsRepository.exportRevenue(params)
    } catch {
      toast.error(t('exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-[22px] font-medium">{t('title')}</h1>
        <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
          {t('export')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <Labeled label={t('filterBranch')}>
          <Select
            allowClear showSearch optionFilterProp="label"
            placeholder={t('allBranches')} style={{ width: 180 }} className="h-8"
            options={branches.map((b) => ({ value: b.id, label: b.name }))}
            value={branchId} onChange={(v) => changeBranch(v ?? null)}
          />
        </Labeled>
        <Labeled label={t('filterCounter')}>
          <Select
            allowClear showSearch optionFilterProp="label" disabled={!branchId}
            placeholder={t('allCounters')} style={{ width: 160 }} className="h-8"
            options={counters.map((c) => ({ value: c.id, label: c.counterName }))}
            value={counterId} onChange={(v) => setCounterId(v ?? null)}
          />
        </Labeled>
        <Labeled label={t('filterDateRange')}>
          <DatePicker.RangePicker
            className="h-8"
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
        </Labeled>

        <div style={{ width: 1, height: 36, background: FILTER_DIVIDER }} />

        <Labeled label={t('filterCurrency')}>
          <Select<CurrencyCode>
            style={{ width: 160 }} className="h-8 rev-currency-select"
            value={currency} onChange={setCurrency}
            options={CURRENCY_CODES.map((c) => ({ value: c, label: `${t(`currency.${c}`)} (${CURRENCIES[c].sym})` }))}
          />
        </Labeled>

        {hasFilter && (
          <Button className="ml-auto" icon={<CloseOutlined />} onClick={clearAll}>
            {t('clearFilters')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={6} rows={6} />
      ) : !data ? (
        <EmptyHint>{t('empty')}</EmptyHint>
      ) : (
        <div className="space-y-4">
          <RevenueStatCards summary={data.summary} currency={currency} />
          <RevenueCharts byDate={data.byDate} summary={data.summary} currency={currency} fromDate={fromDate} toDate={toDate} />
          <RevenueTable byDate={data.byDate} summary={data.summary} currency={currency} loading={isFetching} />
        </div>
      )}

      <style>{`
        .rev-currency-select.ant-select-focused .ant-select-selector {
          border-color: #B8860B !important;
          box-shadow: 0 0 0 2px rgba(184,134,11,.15) !important;
        }
      `}</style>
    </div>
  )
}
