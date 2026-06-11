'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { useTransactions } from '@/hooks/useTransactions'
import { DataTable } from '@/components/shared/DataTable'
import { createOrderColumns } from '@/components/admin/columns/order-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Input } from '@/components/ui/input'
import type { TransactionStatus, TransactionType } from '@/types/transaction'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

const PAGE_SIZE = 20

export default function OrdersPage() {
  const t = useTranslations('admin.orders')

  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterQ, setFilterQ] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => { setFilterQ(searchInput); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const statusLabels = useMemo(() => ({
    Pending:   t('transactionStatuses.PENDING.label'),
    Approved:  t('transactionStatuses.APPROVED.label'),
    Completed: t('transactionStatuses.COMPLETED.label'),
    Rejected:  t('transactionStatuses.REJECTED.label'),
  }), [t])

  const typeLabels = useMemo(() => ({
    SellGold:         t('transactionTypes.SellGold'),
    SellSilver:       t('transactionTypes.SellSilver'),
    BuyGold:          t('transactionTypes.BuyGold'),
    ExchangeGold:     t('transactionTypes.ExchangeGold'),
    ExchangeCurrency: t('transactionTypes.ExchangeCurrency'),
  }), [t])

  const { data, isLoading } = useTransactions({
    status: filterStatus as TransactionStatus ?? undefined,
    type: filterType as TransactionType ?? undefined,
    from: filterFrom || undefined,
    to: filterTo || undefined,
    q: filterQ || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

  const transactions = data?.data ?? []
  const revenue = transactions.reduce((s, tx) => s + (tx.totalAmount ?? 0), 0)

  const columns = useMemo(() => createOrderColumns({
    invoiceCode:  t('columns.invoiceCode'),
    time:         t('columns.time'),
    type:         t('columns.type'),
    payment:      t('columns.payment'),
    amount:       t('columns.amount'),
    status:       t('columns.status'),
    openMenu:     t('columns.openMenu'),
    viewDetail:   t('columns.viewDetail'),
    transactionTypes: typeLabels,
    transactionStatuses: {
      DRAFT:     { label: t('transactionStatuses.DRAFT.label'),     variant: 'secondary' },
      PENDING:   { label: statusLabels.Pending,   variant: 'outline' },
      APPROVED:  { label: statusLabels.Approved,  variant: 'default' },
      COMPLETED: { label: statusLabels.Completed, variant: 'default' },
      REJECTED:  { label: statusLabels.Rejected,  variant: 'destructive' },
    },
  }), [t, statusLabels, typeLabels])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('summary', { count: data?.total ?? 0 })}{' '}
          <span className="font-semibold text-foreground">{formatKip(revenue)}</span>
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('filterQ')}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="h-8 w-56 text-sm"
        />

        {/* Status */}
        <Select
          value={filterStatus || undefined}
          onChange={v => { setFilterStatus(v ?? null); setPage(1) }}
          placeholder={t('filterStatus')}
          options={[
            { value: 'Pending',   label: statusLabels.Pending },
            { value: 'Approved',  label: statusLabels.Approved },
            { value: 'Completed', label: statusLabels.Completed },
            { value: 'Rejected',  label: statusLabels.Rejected },
          ]}
          allowClear
          className="min-w-40"
          popupMatchSelectWidth={false}
        />

        {/* Type */}
        <Select
          value={filterType || undefined}
          onChange={v => { setFilterType(v ?? null); setPage(1) }}
          placeholder={t('filterType')}
          options={[
            { value: 'SellGold',         label: typeLabels.SellGold },
            { value: 'SellSilver',       label: typeLabels.SellSilver },
            { value: 'BuyGold',          label: typeLabels.BuyGold },
            { value: 'ExchangeGold',     label: typeLabels.ExchangeGold },
            { value: 'ExchangeCurrency', label: typeLabels.ExchangeCurrency },
          ]}
          allowClear
          className="min-w-44"
          popupMatchSelectWidth={false}
        />

        {/* Date range */}
        <Input
          type="date"
          value={filterFrom}
          onChange={e => { setFilterFrom(e.target.value); setPage(1) }}
          className="h-8 w-36 text-sm"
          title={t('filterFrom')}
        />
        <Input
          type="date"
          value={filterTo}
          onChange={e => { setFilterTo(e.target.value); setPage(1) }}
          className="h-8 w-36 text-sm"
          title={t('filterTo')}
        />
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={transactions}
          hideSearch
          serverPagination={data ? {
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}
    </div>
  )
}
