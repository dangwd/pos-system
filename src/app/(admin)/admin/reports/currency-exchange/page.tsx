'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, DatePicker, Button } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Panel, EmptyHint, StatCard, formatNum } from '@/components/admin/reports/report-ui'
import { CurrencyExchangeDetail } from '@/components/admin/reports/currency-exchange/CurrencyExchangeDetail'
import { useBranches } from '@/hooks/useBranches'
import { useCurrencies } from '@/hooks/useConfig'
import { useCurrencyExchangeReport } from '@/hooks/useReports'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { useToast } from '@/lib/toast'
import type { TableColumnsType } from 'antd'
import { FlagIcon } from '@/components/shared/FlagIcon'
import type { CurrencyExchangeTx } from '@/types/report'

const { RangePicker } = DatePicker

const PAGE_SIZE = 20

// Số tiền ngoại tệ có thể lẻ tới 4 chữ số (vd 872.7273 USD)
const fmtAmt = (n: number) => n.toLocaleString('lo-LA', { maximumFractionDigits: 4 })

function todayIso() {
  return dayjs().format('YYYY-MM-DD')
}
function yesterdayIso() {
  return dayjs().subtract(1, 'day').format('YYYY-MM-DD')
}

export default function CurrencyExchangeReportPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.reports.currencyExchange')
  const toast = useToast()

  const [branchId, setBranchId] = useState<string | null>(null)
  const [from, setFrom] = useState(yesterdayIso())
  const [to, setTo] = useState(todayIso())
  const [currency, setCurrency] = useState<string | null>('LAK')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const { data: branches = [] } = useBranches()
  const { data: currencies = [] } = useCurrencies()

  // Reset trang khi filter đổi
  const [prevFilters, setPrevFilters] = useState({ from, to, branchId, currency })
  const curFilters = { from, to, branchId, currency }
  if (JSON.stringify(curFilters) !== JSON.stringify(prevFilters)) {
    setPrevFilters(curFilters)
    setPage(1)
  }

  // ── Báo cáo đổi ngoại tệ — GET /api/reports/currency-exchange (1 call) ──────────
  // `currency` chỉ lọc danh sách phiếu; balanceSummary luôn trả mọi loại tiền.
  const reportParams = {
    from: from + 'T00:00:00Z',
    to: to + 'T23:59:59Z',
    branchId: branchId ?? undefined,
    currency: currency ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  }
  const { data: report, isLoading, isFetching } = useCurrencyExchangeReport(reportParams)

  async function handleExport() {
    setExporting(true)
    try {
      await transactionRepository.exportList({
        type: 'ExchangeCurrency',
        branchId: branchId ?? undefined,
        from: from + 'T00:00:00Z',
        to: to + 'T23:59:59Z',
      })
    } catch {
      toast.error(t('exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  // Loại tiền đang xem cho 4 card (mặc định LAK). balanceSummary không bị param `currency` cắt.
  const selectedCurrency = currency ?? 'LAK'
  const hasNative = selectedCurrency !== 'LAK'
  const summary = report?.balanceSummary.find(c => c.currencyCode === selectedCurrency)

  const opening = summary?.openingBalance ?? 0
  const totalIn = summary?.totalIn ?? 0
  const totalOut = summary?.totalOut ?? 0
  const closing = summary?.closingBalance ?? 0

  const unit = hasNative ? selectedCurrency : '₭'
  const money = (n: number) => `${formatNum(n)} ${unit}`

  const rows = report?.transactions.data ?? []
  const totalTx = report?.transactions.pagination.totalItems ?? 0

  const columns: TableColumnsType<CurrencyExchangeTx> = [
    {
      title: t('colInvoice'),
      dataIndex: 'invoiceCode',
      key: 'invoiceCode',
      width: 140,
      render: (v: string) => <span className="font-mono text-xs">{v}</span>,
    },
    {
      title: t('colTime'),
      dataIndex: 'transactedAt',
      key: 'transactedAt',
      width: 150,
      render: (v: string) => (
        <span className="font-mono text-xs">{dayjs(v).format('HH:mm:ss - DD/MM/YYYY')}</span>
      ),
    },
    {
      title: t('colCustomer'),
      dataIndex: 'customerName',
      key: 'customerName',
      render: (v: string | null) => v ?? <span className="text-muted-foreground">—</span>,
    },
    {
      title: t('detailNote'),
      key: 'note',
      width: 280,
      render: (_, r) =>
        r.legs.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {r.legs.map(l => `${fmtAmt(l.fromAmount)} ${l.fromCurrency} → ${l.toCurrency}`).join(', ')}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      title: t('colTotalLak'),
      key: 'totalLak',
      align: 'right',
      width: 160,
      render: (_, r) => (
        <span className="tabular-nums font-medium">
          {formatNum(r.legs.reduce((s, l) => s + l.lakEquivalent, 0))} ₭
        </span>
      ),
    },
    {
      title: t('colCounter'),
      dataIndex: 'counterName',
      key: 'counterName',
      width: 140,
      render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span>,
    },
    {
      title: t('colBranch'),
      dataIndex: 'branchName',
      key: 'branchName',
      width: 140,
      render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span>,
    },
    {
      title: t('colCashier'),
      dataIndex: 'cashierName',
      key: 'cashierName',
      width: 140,
      render: (v: string) => <span className="text-xs">{v}</span>,
    },
  ]

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button icon={<DownloadOutlined />} onClick={handleExport} loading={exporting}>
          {t('export')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <RangePicker
          value={[from ? dayjs(from) : null, to ? dayjs(to) : null]}
          onChange={(dates) => {
            setFrom(dates?.[0] ? dates[0].format('YYYY-MM-DD') : yesterdayIso())
            setTo(dates?.[1] ? dates[1].format('YYYY-MM-DD') : todayIso())
          }}
          format="DD/MM/YYYY"
          allowClear={false}
          className="h-8"
        />
        <Select
          showSearch optionFilterProp="label" allowClear
          placeholder={t('filterAllBranches')} style={{ width: 180 }}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          value={branchId}
          onChange={v => setBranchId(v ?? null)}
        />
        <Select
          allowClear
          placeholder={t('filterAllCurrencies')} style={{ width: 150 }}
          options={currencies
            .filter(c => c.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(c => ({ value: c.code, label: c.flag ? <><FlagIcon flag={c.flag} style={{ marginRight: 4 }} />{c.code}</> : c.code }))}
          value={currency}
          onChange={v => setCurrency(v ?? null)}
        />
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={6} rows={6} />
      ) : (
        <div className="space-y-5">
          {/* Tồn quỹ — đổ số theo loại tiền đang chọn (đơn vị nguyên bản) */}
          <Panel title={hasNative ? t('summaryOriginal', { currency: selectedCurrency }) : t('summaryLak')}>
            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t('cardOpening')} value={money(opening)} />
              <StatCard label={t('cardIn')} value={money(totalIn)} />
              <StatCard label={t('cardOut')} value={money(totalOut)} />
              <StatCard label={t('cardClosing')} value={money(closing)} />
            </div>
          </Panel>

          {/* Danh sách giao dịch ngoại tệ */}
          <Panel title={`${t('txTitle')} (${totalTx})`}>
            {rows.length === 0 ? (
              <EmptyHint>{t('empty')}</EmptyHint>
            ) : (
              <DataTable
                columns={columns}
                data={rows}
                rowKey="id"
                hideSearch
                maxHeight={false}
                loading={isFetching}
                renderSubRow={(row) => <CurrencyExchangeDetail tx={row} />}
                serverPagination={{
                  total: totalTx,
                  page,
                  pageSize: PAGE_SIZE,
                  onPageChange: setPage,
                }}
              />
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}
