/**
 * Admin — Nhật ký giao dịch
 *
 * Dùng <DataTable> reusable + createOrderColumns(labels).
 * staleTime: 30s, refetchInterval: 30s để tự cập nhật khi POS tạo GD mới.
 */

'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { DataTable } from '@/components/shared/DataTable'
import { createOrderColumns } from '@/components/admin/columns/order-columns'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { useTranslations } from 'next-intl'

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

export default function OrdersPage() {
  const t = useTranslations('admin.orders')

  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionRepository.getList(),
    staleTime: 30_000,
    refetchInterval: 30_000,
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
          {t('summary', { count: transactions.length })}{' '}
          <span className="font-semibold text-foreground">{formatKip(revenue)}</span>
        </p>
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={transactions}
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
    </div>
  )
}
