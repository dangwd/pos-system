'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Select, DatePicker, Tabs } from 'antd'
import dayjs from 'dayjs'
import { Badge } from '@/components/ui/badge'
import { createOrderColumns } from '@/components/admin/columns/order-columns'
import { TransactionExpandedRow } from '@/components/admin/orders/TransactionExpandedRow'
import { useTransactions } from '@/hooks/useTransactions'
import { useInventory } from '@/hooks/useInventory'
import { useWeightUnits } from '@/hooks/useConfig'
import type { Product } from '@/types/product'
import type { Transaction, TransactionStatus, TransactionType } from '@/types/transaction'
import type { InventoryItem } from '@/types/inventory'

const PAGE_SIZE = 10

function fmtKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

// ─── Tab: Thuộc tính ────────────────────────────────────────────────────────

function AttributesTab({ product }: { product: Product }) {
  const t = useTranslations('admin.products')
  const { data: weightUnits = [] } = useWeightUnits()
  const unitName = product.weightUnitId
    ? (weightUnits.find((u) => u.id === product.weightUnitId)?.tenDonVi ?? '—')
    : '—'

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: t('columns.productCode'), value: <span className="font-mono">{product.productCode}</span> },
    { label: t('columns.product'),     value: product.productName },
    { label: t('columns.category'),    value: product.category.name },
    { label: t('columns.purity'),      value: product.purity ?? '—' },
    { label: t('columns.unit'),        value: unitName },
    { label: t('detail.weight'),       value: `${product.weightGram} g` },
    {
      label: t('columns.status'),
      value: (
        <Badge variant={product.isActive ? 'default' : 'secondary'}>
          {product.isActive ? t('columns.active') : t('columns.inactive')}
        </Badge>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-2xl">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between border-b border-dashed py-1.5 text-sm">
          <span className="text-muted-foreground">{r.label}</span>
          <span className="font-medium text-right">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Tab: Tồn kho ───────────────────────────────────────────────────────────

function InventoryTab({ product }: { product: Product }) {
  const t = useTranslations('admin.products')
  const { data, isLoading } = useInventory({ keyword: product.productCode, pageSize: 50 })
  // keyword khớp nhiều mã — giữ đúng sản phẩm theo productCode
  const items = (data?.data ?? []).filter((it) => it.productCode === product.productCode)

  const columns = [
    { title: t('detail.invCounter'), dataIndex: 'counterName', key: 'counterName' },
    { title: t('detail.invQty'), dataIndex: 'quantity', key: 'quantity', align: 'right' as const, width: 90 },
    {
      title: t('detail.invWeight'), dataIndex: 'weightGram', key: 'weightGram', align: 'right' as const, width: 120,
      render: (v: number) => `${v} g`,
    },
  ]

  return (
    <Table<InventoryItem>
      rowKey="id"
      columns={columns}
      dataSource={items}
      loading={isLoading}
      size="small"
      bordered
      pagination={false}
      scroll={{ y: 320 }}
      locale={{ emptyText: t('detail.invEmpty') }}
    />
  )
}

// ─── Tab: Lịch sử giao dịch ──────────────────────────────────────────────────

function TransactionsTab({ product }: { product: Product }) {
  const t  = useTranslations('admin.orders')
  const tp = useTranslations('admin.products')

  const [page, setPage]                 = useState(1)
  const [pageSize, setPageSize]         = useState(PAGE_SIZE)
  const [sortField, setSortField]       = useState<string | null>(null)
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc' | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [filterType, setFilterType]     = useState<string | null>(null)
  const [filterFrom, setFilterFrom]     = useState('')
  const [filterTo, setFilterTo]         = useState('')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const transactionStatuses = useMemo(() => ({
    Completed: { label: t('transactionStatuses.Completed.label'), variant: 'default' as const },
    Cancelled: { label: t('transactionStatuses.Cancelled.label'), variant: 'destructive' as const },
  }), [t])

  const typeLabels = useMemo(() => ({
    SellGold:         t('transactionTypes.SellGold'),
    SellSilver:       t('transactionTypes.SellSilver'),
    BuyGold:          t('transactionTypes.BuyGold'),
    BuyMoreGold:      t('transactionTypes.BuyMoreGold'),
    ExchangeGold:     t('transactionTypes.ExchangeGold'),
    ExchangeFree:     t('transactionTypes.ExchangeFree'),
    ExchangeToMoney:  t('transactionTypes.ExchangeToMoney'),
    ExchangeCurrency: t('transactionTypes.ExchangeCurrency'),
  }), [t])

  const { data, isLoading, isFetching } = useTransactions({
    productId: product.id,
    status:    (filterStatus as TransactionStatus) ?? undefined,
    type:      (filterType as TransactionType) ?? undefined,
    from:      filterFrom || undefined,
    to:        filterTo || undefined,
    page,
    pageSize,
    sortField: sortField ?? undefined,
    sortOrder: sortOrder ?? undefined,
  })

  const transactions = data?.data ?? []
  const revenue = transactions.reduce((s, tx) => s + (tx.totalAmount ?? 0), 0)

  const columns = useMemo(() => createOrderColumns({
    colType:        t('columns.type'),
    colInvoiceCode: t('columns.invoiceCode'),
    colRefCode:     t('columns.refCode'),
    colTime:        t('columns.time'),
    colCustomer:    t('columns.customer'),
    colAmount:      t('columns.amount'),
    colStatus:      t('columns.status'),
    transactionTypes: typeLabels,
    transactionStatuses,
  }), [t, typeLabels, transactionStatuses])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterStatus || undefined}
          onChange={(v) => { setFilterStatus(v ?? null); setPage(1) }}
          placeholder={t('filterStatus')}
          options={[
            { value: 'Completed', label: transactionStatuses.Completed.label },
            { value: 'Cancelled', label: transactionStatuses.Cancelled.label },
          ]}
          allowClear
          style={{ minWidth: 150 }}
          popupMatchSelectWidth={false}
        />
        <Select
          value={filterType || undefined}
          onChange={(v) => { setFilterType(v ?? null); setPage(1) }}
          placeholder={t('filterType')}
          options={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
          allowClear
          style={{ minWidth: 160 }}
          popupMatchSelectWidth={false}
        />
        <DatePicker.RangePicker
          value={[filterFrom ? dayjs(filterFrom) : null, filterTo ? dayjs(filterTo) : null]}
          onChange={(range) => {
            setFilterFrom(range?.[0] ? range[0].format('YYYY-MM-DD') : '')
            setFilterTo(range?.[1] ? range[1].format('YYYY-MM-DD') : '')
            setPage(1)
          }}
          format="DD/MM/YYYY"
          allowEmpty={[true, true]}
          style={{ height: 32 }}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {tp('txnHistory.summary', { count: data?.total ?? 0 })} ·{' '}
          <span className="font-semibold text-foreground">{fmtKip(revenue)}</span>
        </span>
      </div>

      <Table<Transaction>
        rowKey="id"
        columns={columns}
        dataSource={transactions}
        loading={isLoading || isFetching}
        size="small"
        bordered
        scroll={{ x: 900, y: 360 }}
        rowClassName={(r) => expandedKeys.includes(r.id) ? 'order-row-expanded' : ''}
        expandable={{
          expandedRowKeys: expandedKeys,
          expandRowByClick: true,
          showExpandColumn: false,
          onExpand: (expanded, record) => setExpandedKeys(expanded ? [record.id] : []),
          expandedRowRender: (record) => <TransactionExpandedRow record={record} />,
        }}
        onChange={(_p, _f, sorter) => {
          if (!Array.isArray(sorter) && sorter.field) {
            setSortField(sorter.field as string)
            setSortOrder(sorter.order === 'ascend' ? 'asc' : sorter.order === 'descend' ? 'desc' : null)
            setPage(1)
          }
        }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => { setPage(p); if (ps !== pageSize) { setPageSize(ps); setPage(1) } },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (tot, [from, to]) => `${from}–${to} / ${tot}`,
        }}
        locale={{ emptyText: tp('txnHistory.empty') }}
      />
    </div>
  )
}

// ─── Expanded row (3 tabs) ────────────────────────────────────────────────────

export function ProductExpandedRow({ product }: { product: Product }) {
  const t = useTranslations('admin.products')
  return (
    <div className="py-1">
      <Tabs
        size="small"
        items={[
          { key: 'attrs', label: t('detail.tabAttributes'), children: <AttributesTab product={product} /> },
          { key: 'stock', label: t('detail.tabInventory'),  children: <InventoryTab product={product} /> },
          { key: 'txns',  label: t('detail.tabTransactions'), children: <TransactionsTab product={product} /> },
        ]}
      />
      <style>{`.order-row-expanded > td { background: #eff6ff !important; } .exchange-in-row > td { background: #eff6ff !important; }`}</style>
    </div>
  )
}
