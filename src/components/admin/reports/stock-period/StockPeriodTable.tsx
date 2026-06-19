'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Spin } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { Badge } from '@/components/ui/badge'
import { formatNum } from '@/components/admin/reports/report-ui'
import { useStockMovements } from '@/hooks/useReports'
import { DocumentDialog, type DocRef } from './DocumentDialog'
import type { StockPeriodItem, StockMovementLine } from '@/types/report'

const SEP = '1.5px solid var(--border)'
const sepCell = () => ({ style: { borderLeft: SEP } })

const qty = (n: number) => n > 0 ? formatNum(n) : <span className="text-muted-foreground">—</span>
const recv = (n: number) => n > 0
  ? <span style={{ fontWeight: 500 }}>{formatNum(n)}</span>
  : <span className="text-muted-foreground">—</span>
const issue = (n: number) => n > 0
  ? <span style={{ fontWeight: 500 }}>{formatNum(n)}</span>
  : <span className="text-muted-foreground">—</span>

// ─── Chi tiết phát sinh nhập/xuất của 1 dòng (lazy fetch khi mở rộng) ─────────

function MovementDetail({ row, fromDate, toDate }: { row: StockPeriodItem; fromDate: string; toDate: string }) {
  const t = useTranslations('admin.reports.stockPeriod')
  const [doc, setDoc] = useState<DocRef | null>(null)
  const { data = [], isLoading } = useStockMovements({
    productId: row.productId, branchId: row.branchId, fromDate, toDate,
  })

  if (isLoading) return <div className="py-4 text-center"><Spin size="small" /></div>

  const cols: TableColumnsType<StockMovementLine> = [
    { title: t('movDate'), dataIndex: 'occurredAt', key: 'occurredAt', width: 140,
      render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm') },
    { title: t('movType'), dataIndex: 'direction', key: 'direction', width: 90,
      render: (v: 'IN' | 'OUT') => v === 'IN'
        ? <span style={{ fontWeight: 500 }}>{t('movIn')}</span>
        : <span style={{ fontWeight: 500 }}>{t('movOut')}</span> },
    { title: t('movQty'), dataIndex: 'quantity', key: 'quantity', width: 90, align: 'right',
      render: (v: number) => <span>{formatNum(v)}</span> },
    { title: t('movRef'), dataIndex: 'refCode', key: 'refCode', width: 150,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs text-primary hover:underline underline-offset-2"
          onClick={(e) => { e.stopPropagation(); setDoc({ refType: r.refType, refId: r.refId, refCode: r.refCode }) }}
        >
          {v}
        </button>
      ) },
    { title: t('movReason'), dataIndex: 'reason', key: 'reason',
      render: (v: string | null) => v ?? <span className="text-muted-foreground">—</span> },
    { title: t('movStore'), key: 'store', width: 140,
      render: () => <span className="text-xs text-muted-foreground">{row.branchName}</span> },
    { title: t('movCounter'), dataIndex: 'counterName', key: 'counterName', width: 120,
      render: (v: string | null) => <span className="text-xs text-muted-foreground">{v ?? '—'}</span> },
  ]

  return (
    <>
      <Table<StockMovementLine>
        rowKey="id"
        columns={cols}
        dataSource={data}
        size="small"
        bordered
        pagination={false}
        locale={{ emptyText: t('movEmpty') }}
        scroll={{ x: 700 }}
      />
      <DocumentDialog doc={doc} onClose={() => setDoc(null)} />
    </>
  )
}

export function StockPeriodTable({ items, fromDate, toDate, loading }: {
  items: StockPeriodItem[]; fromDate: string; toDate: string; loading?: boolean
}) {
  const t = useTranslations('admin.reports.stockPeriod')
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const rowKey = (r: StockPeriodItem) => `${r.productId}-${r.branchId}`

  const columns: TableColumnsType<StockPeriodItem> = [
    {
      title: t('grpItem'),
      children: [
        { title: t('colCode'), dataIndex: 'productCode', key: 'productCode', width: 110, fixed: 'left',
          render: (v: string) => <span className="font-mono text-xs text-muted-foreground">{v}</span> },
        { title: t('colName'), dataIndex: 'productName', key: 'productName', width: 160, fixed: 'left',
          render: (v: string) => <span className="font-medium">{v}</span> },
        { title: t('colCategory'), dataIndex: 'category', key: 'category', width: 120,
          render: (v: string) => <Badge variant="secondary" className="text-[10px]">{v}</Badge> },
        { title: t('colKarat'), dataIndex: 'karat', key: 'karat', width: 80,
          render: (v: string) => <span className="font-medium">{v}</span> },
        { title: t('colUnit'), dataIndex: 'unit', key: 'unit', width: 70,
          render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
        { title: t('colBranch'), dataIndex: 'branchName', key: 'branchName', width: 140,
          render: (v: string) => <span className="text-xs text-muted-foreground">{v}</span> },
        { title: t('colSource'), dataIndex: 'source', key: 'source', width: 110,
          render: (v: string) => v
            ? <span className="px-1.5 py-0.5 text-[10px] rounded" style={{ background: '#EAF3DE', color: '#27500A' }}>{v}</span>
            : <span className="text-muted-foreground">—</span> },
      ],
    },
    // Đầu kỳ — 1 cột SL (không sub-text, không KL, không ngày)
    {
      title: t('grpOpen'), dataIndex: 'openQty', key: 'openQty', width: 110, align: 'right',
      onHeaderCell: () => ({ style: { borderLeft: SEP } }),
      onCell: sepCell, render: qty,
    },
    // Trong kỳ — Nhập / Xuất
    {
      title: t('grpChange'),
      onHeaderCell: () => ({ style: { borderLeft: SEP } }),
      children: [
        { title: t('colReceipt'), dataIndex: 'receiptQty', key: 'receiptQty', width: 95, align: 'right',
          onCell: sepCell, onHeaderCell: sepCell, render: recv },
        { title: t('colIssue'), dataIndex: 'issueQty', key: 'issueQty', width: 95, align: 'right', render: issue },
      ],
    },
    // Cuối kỳ — 1 cột SL (đậm)
    {
      title: t('grpClose'), dataIndex: 'closeQty', key: 'closeQty', width: 110, align: 'right',
      onHeaderCell: () => ({ style: { borderLeft: SEP } }),
      onCell: sepCell,
      render: (n: number) => n > 0
        ? <span className="font-semibold">{formatNum(n)}</span>
        : <span className="text-muted-foreground">—</span>,
    },
  ]

  const totals = items.reduce(
    (a, it) => ({
      openQty: a.openQty + it.openQty,
      receiptQty: a.receiptQty + it.receiptQty,
      issueQty: a.issueQty + it.issueQty,
      closeQty: a.closeQty + it.closeQty,
    }),
    { openQty: 0, receiptQty: 0, issueQty: 0, closeQty: 0 },
  )

  return (
    <>
    <style>{`.stock-period-table .ant-table-thead > tr > th { text-align: center !important; }`}</style>
    <Table<StockPeriodItem>
      className="stock-period-table"
      rowKey={rowKey}
      columns={columns}
      dataSource={items}
      loading={loading}
      size="small"
      bordered
      sticky
      scroll={{ x: 1100, y: 460 }}
      pagination={false}
      locale={{ emptyText: t('empty') }}
      rowClassName="cursor-pointer"
      expandable={{
        expandedRowKeys: expandedKeys,
        expandRowByClick: true,
        showExpandColumn: false,
        onExpand: (expanded, record) => setExpandedKeys(expanded ? [rowKey(record)] : []),
        expandedRowRender: (record) => <MovementDetail row={record} fromDate={fromDate} toDate={toDate} />,
      }}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ background: 'var(--muted)', fontWeight: 600 }}>
            <Table.Summary.Cell index={0} colSpan={7}>
              {t('totalRow', { count: items.length })}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="right">{formatNum(totals.openQty)}</Table.Summary.Cell>
            <Table.Summary.Cell index={8} align="right">
              {formatNum(totals.receiptQty)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={9} align="right">
              {formatNum(totals.issueQty)}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={10} align="right">{formatNum(totals.closeQty)}</Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
    </>
  )
}
