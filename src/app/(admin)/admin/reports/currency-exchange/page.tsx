'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, DatePicker, Input, Button } from 'antd'
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
import { useTransactions } from '@/hooks/useTransactions'
import { useCashLedgerActivities } from '@/hooks/useCashLedger'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { useToast } from '@/lib/toast'
import type { TableColumnsType } from 'antd'
import { FlagIcon } from '@/components/shared/FlagIcon'
import type { Transaction } from '@/types/transaction'

const PAGE_SIZE = 20

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
  const [searchInput, setSearchInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => setQ(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: branches = [] } = useBranches()
  const { data: currencies = [] } = useCurrencies()

  // Reset trang khi filter đổi
  const [prevFilters, setPrevFilters] = useState({ from, to, branchId, currency, q })
  const curFilters = { from, to, branchId, currency, q }
  if (JSON.stringify(curFilters) !== JSON.stringify(prevFilters)) {
    setPrevFilters(curFilters)
    setPage(1)
  }

  // ── Danh sách giao dịch ngoại tệ — GET /api/transactions?type=ExchangeCurrency ──
  const txParams = {
    type: 'ExchangeCurrency' as const,
    branchId: branchId ?? undefined,
    from: from + 'T00:00:00Z',
    to: to + 'T23:59:59Z',
    q: q || undefined,
  }
  const { data: txPage, isLoading, isFetching } = useTransactions({
    ...txParams,
    page,
    pageSize: PAGE_SIZE,
  })

  // ── Tồn quỹ ngoại tệ — GET /api/cash-ledger/activities (chỉ lấy tổng hợp) ───────
  const { data: cash } = useCashLedgerActivities({
    branchId: branchId ?? undefined,
    fromDate: from,
    toDate: to,
    currency: currency ?? undefined,
    page: 1,
    pageSize: 1,
  })

  async function handleExport() {
    setExporting(true)
    try {
      await transactionRepository.exportList(txParams)
    } catch {
      toast.error(t('exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  const hasNative = !!(currency && currency !== 'LAK')

  // Đổ số theo loại tiền đang chọn: LAK/Mọi loại → quy đổi LAK, ngoại tệ → tiền gốc
  const opening = hasNative ? (cash?.openingBalanceOriginal ?? 0) : (cash?.openingBalanceLak ?? 0)
  const totalIn = hasNative ? (cash?.totalInOriginal ?? 0) : (cash?.totalInLak ?? 0)
  const totalOut = hasNative ? (cash?.totalOutOriginal ?? 0) : (cash?.totalOutLak ?? 0)
  const closing = opening + totalIn - totalOut

  const unit = hasNative ? (currency as string) : '₭'
  const money = (n: number) => `${formatNum(n)} ${unit}`

  const columns: TableColumnsType<Transaction> = [
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
      render: (v: string) => {
        const d = dayjs(v)
        return <span className="font-mono text-xs">{d.format('HH:mm:ss - DD/MM/YYYY')}</span>
      },
    },
    {
      title: t('colCustomer'),
      key: 'customer',
      render: (_, r) => r.customer?.name ?? <span className="text-muted-foreground">—</span>,
    },
    {
      title: t('detailPhone'),
      key: 'phone',
      width: 130,
      render: (_, r) => r.customer?.phoneNumber
        ? <span className="tabular-nums text-xs">{r.customer.phoneNumber}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    {
      title: t('detailPayment'),
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 130,
      render: (v: Transaction['paymentMethod']) => <span className="text-xs">{t(`method${v}`)}</span>,
    },
    {
      title: t('detailNote'),
      dataIndex: 'note',
      key: 'note',
      width: 240,
      render: (v: string | null) => v
        ? <span className="text-xs text-muted-foreground">{v}</span>
        : <span className="text-muted-foreground">—</span>,
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
        <DatePicker
          value={from ? dayjs(from) : null}
          onChange={d => setFrom(d ? d.format('YYYY-MM-DD') : yesterdayIso())}
          format="DD/MM/YYYY"
          allowClear={false}
          className="h-8"
        />
        <span className="text-muted-foreground">–</span>
        <DatePicker
          value={to ? dayjs(to) : null}
          onChange={d => setTo(d ? d.format('YYYY-MM-DD') : todayIso())}
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
        <Input
          allowClear placeholder={t('searchPlaceholder')} style={{ width: 220 }}
          value={searchInput} onChange={e => setSearchInput(e.target.value)}
        />
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={6} rows={6} />
      ) : (
        <div className="space-y-5">
          {/* Tồn quỹ — đổ số theo loại tiền đang chọn */}
          <Panel title={hasNative ? t('summaryOriginal', { currency: currency ?? '' }) : t('summaryLak')}>
            <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label={t('cardOpening')}
                value={branchId ? money(opening) : '—'}
                sub={branchId ? undefined : t('openingNeedsBranch')}
              />
              <StatCard label={t('cardIn')} value={money(totalIn)} />
              <StatCard label={t('cardOut')} value={money(totalOut)} />
              <StatCard
                label={t('cardClosing')}
                value={branchId ? money(closing) : '—'}
                sub={branchId ? undefined : t('openingNeedsBranch')}
              />
            </div>
          </Panel>

          {/* Danh sách giao dịch ngoại tệ */}
          <Panel title={`${t('txTitle')} (${txPage?.total ?? 0})`}>
            {(txPage?.data.length ?? 0) === 0 ? (
              <EmptyHint>{t('empty')}</EmptyHint>
            ) : (
              <DataTable
                columns={columns}
                data={txPage?.data ?? []}
                rowKey="id"
                hideSearch
                maxHeight={false}
                loading={isFetching}
                renderSubRow={(row) => <CurrencyExchangeDetail tx={row} />}
                serverPagination={{
                  total: txPage?.total ?? 0,
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
