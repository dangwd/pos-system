'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useTransactions } from '@/hooks/useTransactions'
import { DataTable } from '@/components/shared/DataTable'
import { createOrderColumns } from '@/components/admin/columns/order-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { TransactionStatus, TransactionType } from '@/types/transaction'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

const ALL = '__all__'
const PAGE_SIZE = 20

export default function OrdersPage() {
  const t = useTranslations('admin.orders')

  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState(ALL)
  const [filterType, setFilterType] = useState(ALL)
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [filterQ, setFilterQ] = useState('')

  // Debounce search — reset page on new query
  useEffect(() => {
    const timer = setTimeout(() => { setFilterQ(searchInput); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleStatusChange = (v: string | null) => { setFilterStatus(v ?? ALL); setPage(1) }
  const handleTypeChange = (v: string | null) => { setFilterType(v ?? ALL); setPage(1) }
  const handleFromChange = (v: string) => { setFilterFrom(v); setPage(1) }
  const handleToChange = (v: string) => { setFilterTo(v); setPage(1) }

  const { data, isLoading } = useTransactions({
    status: filterStatus !== ALL ? (filterStatus as TransactionStatus) : undefined,
    type: filterType !== ALL ? (filterType as TransactionType) : undefined,
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
    transactionTypes: {
      SellGold:         t('transactionTypes.SellGold'),
      SellSilver:       t('transactionTypes.SellSilver'),
      BuyGold:          t('transactionTypes.BuyGold'),
      ExchangeGold:     t('transactionTypes.ExchangeGold'),
      ExchangeCurrency: t('transactionTypes.ExchangeCurrency'),
    },
    transactionStatuses: {
      DRAFT:     { label: t('transactionStatuses.DRAFT.label'),     variant: 'secondary' },
      PENDING:   { label: t('transactionStatuses.PENDING.label'),   variant: 'outline' },
      APPROVED:  { label: t('transactionStatuses.APPROVED.label'),  variant: 'default' },
      COMPLETED: { label: t('transactionStatuses.COMPLETED.label'), variant: 'default' },
      REJECTED:  { label: t('transactionStatuses.REJECTED.label'),  variant: 'destructive' },
    },
  }), [t])

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
        <Select value={filterStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            <SelectItem value="Pending">{t('transactionStatuses.PENDING.label')}</SelectItem>
            <SelectItem value="Approved">{t('transactionStatuses.APPROVED.label')}</SelectItem>
            <SelectItem value="Completed">{t('transactionStatuses.COMPLETED.label')}</SelectItem>
            <SelectItem value="Rejected">{t('transactionStatuses.REJECTED.label')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={handleTypeChange}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder={t('filterType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            <SelectItem value="SellGold">{t('transactionTypes.SellGold')}</SelectItem>
            <SelectItem value="SellSilver">{t('transactionTypes.SellSilver')}</SelectItem>
            <SelectItem value="BuyGold">{t('transactionTypes.BuyGold')}</SelectItem>
            <SelectItem value="ExchangeGold">{t('transactionTypes.ExchangeGold')}</SelectItem>
            <SelectItem value="ExchangeCurrency">{t('transactionTypes.ExchangeCurrency')}</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterFrom}
          onChange={e => handleFromChange(e.target.value)}
          className="h-8 w-36 text-sm"
          aria-label={t('filterFrom')}
          title={t('filterFrom')}
        />
        <Input
          type="date"
          value={filterTo}
          onChange={e => handleToChange(e.target.value)}
          className="h-8 w-36 text-sm"
          aria-label={t('filterTo')}
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
