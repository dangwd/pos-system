'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select, DatePicker, Table, Button } from 'antd'
import { CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { DataTable } from '@/components/shared/DataTable'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Panel, EmptyHint, formatNum } from '@/components/admin/reports/report-ui'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useCurrencyExchangeReport } from '@/hooks/useReports'
import type { TableColumnsType } from 'antd'
import type { CurrencyExchangeBalanceRow, CurrencyExchangeTx } from '@/types/report'

// Màu nhóm cột (đồng bộ với bảng tồn kho theo kỳ)
const GRP = {
  open:   { background: '#E6F1FB', color: '#0C447C' },
  change: { background: '#F1EFE8', color: '#444441' },
  close:  { background: '#EAF3DE', color: '#27500A' },
}
const SEP = '1.5px solid var(--border)'
const sepCell = () => ({ style: { borderLeft: SEP } })

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayIso() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

export default function CurrencyExchangeReportPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.reports.currencyExchange')

  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [from, setFrom] = useState(yesterdayIso())
  const [to, setTo] = useState(todayIso())
  const [page, setPage] = useState(1)
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null)
  const PAGE_SIZE = 20

  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(branchId)

  // Reset trang khi filter (kể cả loại tiền) đổi
  const [prevFilters, setPrevFilters] = useState({ from, to, branchId, counterId, selectedCurrency })
  const curFilters = { from, to, branchId, counterId, selectedCurrency }
  if (JSON.stringify(curFilters) !== JSON.stringify(prevFilters)) {
    setPrevFilters(curFilters)
    setPage(1)
  }

  const { data, isLoading, isFetching } = useCurrencyExchangeReport({
    from: from + 'T00:00:00Z',
    to: to + 'T23:59:59Z',
    branchId: branchId ?? undefined,
    counterId: counterId ?? undefined,
    currency: selectedCurrency ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const balanceColumns: TableColumnsType<CurrencyExchangeBalanceRow> = [
    {
      title: t('colCurrency'),
      dataIndex: 'currencyCode',
      key: 'currencyCode',
      render: (v: string) => <span className="font-semibold">{v}</span>,
    },
    {
      title: t('colOpening'),
      dataIndex: 'openingBalance',
      key: 'openingBalance',
      align: 'right',
      width: 240,
      onHeaderCell: () => ({ style: { ...GRP.open, borderLeft: SEP } }),
      onCell: sepCell,
      render: (v: number) => <span className="tabular-nums">{formatNum(v)}</span>,
    },
    {
      title: t('colInPeriod'),
      align: 'center',
      onHeaderCell: () => ({ style: { ...GRP.change, borderLeft: SEP } }),
      children: [
        {
          title: t('colTotalIn'),
          dataIndex: 'totalIn',
          key: 'totalIn',
          align: 'right',
          width: 200,
          onCell: sepCell,
          onHeaderCell: sepCell,
          render: (v: number) => (
            v === 0
              ? <span className="text-muted-foreground">–</span>
              : <span className="tabular-nums text-green-600">+{formatNum(v)}</span>
          ),
        },
        {
          title: t('colTotalOut'),
          dataIndex: 'totalOut',
          key: 'totalOut',
          align: 'right',
          width: 200,
          render: (v: number) => (
            v === 0
              ? <span className="text-muted-foreground">–</span>
              : <span className="tabular-nums text-destructive">−{formatNum(v)}</span>
          ),
        },
      ],
    },
    {
      title: t('colClosing'),
      dataIndex: 'closingBalance',
      key: 'closingBalance',
      align: 'right',
      width: 240,
      onHeaderCell: () => ({ style: { ...GRP.close, borderLeft: SEP } }),
      onCell: sepCell,
      render: (v: number) => <b className="tabular-nums">{formatNum(v)}</b>,
    },
  ]

  const txColumns: TableColumnsType<CurrencyExchangeTx> = [
    {
      title: t('colInvoice'),
      dataIndex: 'invoiceCode',
      key: 'invoiceCode',
      render: (v: string) => <span className="font-mono text-xs text-primary">{v}</span>,
    },
    {
      title: t('colTime'),
      dataIndex: 'transactedAt',
      key: 'transactedAt',
      render: (v: string) => {
        const d = new Date(v)
        return (
          <span className="tabular-nums text-xs">
            {d.toLocaleDateString('lo-LA')} {d.toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )
      },
    },
    {
      title: t('colCustomer'),
      dataIndex: 'customerName',
      key: 'customerName',
      render: (v: string | null) => v ?? <span className="text-muted-foreground">—</span>,
    },
    {
      title: t('colGave'),
      key: 'gave',
      render: (_: unknown, row: CurrencyExchangeTx) => (
        <span className="tabular-nums text-amber-600 font-medium">
          {formatNum(row.sourceAmount)} {row.sourceCurrency}
        </span>
      ),
    },
    {
      title: '',
      key: 'arrow',
      width: 28,
      render: () => <span className="text-muted-foreground">→</span>,
    },
    {
      title: t('colReceived'),
      key: 'received',
      render: (_: unknown, row: CurrencyExchangeTx) => (
        <span className="tabular-nums text-green-600 font-medium">
          {formatNum(row.targetAmount)} {row.targetCurrency}
        </span>
      ),
    },
    {
      title: t('colRate'),
      dataIndex: 'displayRate',
      key: 'displayRate',
      align: 'right',
      render: (v: number) => <span className="tabular-nums">{v.toLocaleString('lo-LA')}</span>,
    },
    {
      title: t('colCounter'),
      dataIndex: 'counterName',
      key: 'counterName',
    },
    {
      title: t('colBranch'),
      dataIndex: 'branchName',
      key: 'branchName',
    },
    {
      title: t('colCashier'),
      dataIndex: 'cashierName',
      key: 'cashierName',
      render: (v: string) => <span className="text-primary">{v}</span>,
    },
  ]

  if (!hasPermission('REPORT_DASHBOARD')) return <ForbiddenPage />

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('title')}</h1>

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
            showSearch
            optionFilterProp="label"
            placeholder={t('filterAllBranches')}
            style={{ width: 160 }}
            allowClear
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={branchId}
            onChange={v => { setBranchId(v ?? null); setCounterId(null) }}
          />
          <Select
            showSearch
            optionFilterProp="label"
            placeholder={t('filterAllCounters')}
            style={{ width: 130 }}
            allowClear
            options={counters.map(c => ({ value: c.id, label: c.counterName }))}
            value={counterId}
            onChange={v => setCounterId(v ?? null)}
            disabled={!branchId}
          />
        </div>
      </div>

      {isLoading ? (
        <TablePageSkeleton cols={5} rows={6} />
      ) : !data ? (
        <EmptyHint>—</EmptyHint>
      ) : (
        <div className="space-y-5">
          {/* Bảng tồn quỹ — click 1 dòng để lọc GD theo loại tiền */}
          <Panel title={t('balanceTitle')}>
            {data.balanceSummary.length === 0 ? (
              <EmptyHint>—</EmptyHint>
            ) : (
              <Table
                className="cx-balance-table"
                columns={balanceColumns}
                dataSource={data.balanceSummary}
                rowKey="currencyCode"
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 'max-content' }}
                rowClassName={(r) =>
                  `cursor-pointer ${r.currencyCode === selectedCurrency ? 'cx-row-selected' : ''}`
                }
                onRow={(r) => ({
                  onClick: () =>
                    setSelectedCurrency((cur) => (cur === r.currencyCode ? null : r.currencyCode)),
                })}
              />
            )}
          </Panel>

          {/* Danh sách giao dịch */}
          <Panel
            title={`${t('txTitle')}${selectedCurrency ? ` — ${selectedCurrency}` : ''} (${data.totalTransactions})`}
            action={
              selectedCurrency && (
                <Button size="small" icon={<CloseOutlined />} onClick={() => setSelectedCurrency(null)}>
                  {t('clearFilter')}
                </Button>
              )
            }
          >
            {data.transactions.data.length === 0 ? (
              <EmptyHint>—</EmptyHint>
            ) : (
              <DataTable
                columns={txColumns}
                data={data.transactions.data}
                rowKey="id"
                hideSearch
                maxHeight={false}
                loading={isFetching}
                serverPagination={{
                  total: data.transactions.pagination.totalItems,
                  page: data.transactions.pagination.page,
                  pageSize: data.transactions.pagination.pageSize,
                  onPageChange: setPage,
                }}
              />
            )}
          </Panel>
        </div>
      )}

      <style>{`
        .cx-balance-table .ant-table-thead > tr > th { text-align: center !important; }
        .cx-row-selected > td { background: #E6F1FB !important; }
        .cx-row-selected > td:first-child { box-shadow: inset 3px 0 0 #0C447C; }
      `}</style>
    </div>
  )
}
