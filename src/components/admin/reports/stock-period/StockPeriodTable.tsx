'use client'

import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import { formatNum, formatGram } from '@/components/admin/reports/report-ui'
import type { StockPeriodItem } from '@/types/report'

// Màu nhóm cột theo spec
const GRP = {
  open:   { background: '#E6F1FB', color: '#0C447C' },
  change: { background: '#F1EFE8', color: '#444441' },
  mid:    { background: '#FAEEDA', color: '#633806' },
  close:  { background: '#EAF3DE', color: '#27500A' },
}
const SEP = '1.5px solid var(--border)'

const qty = (n: number) => n > 0 ? formatNum(n) : <span className="text-muted-foreground">—</span>
const wgt = (n: number) => n > 0 ? formatGram(n) : <span className="text-muted-foreground">—</span>
const recv = (n: number) => n > 0
  ? <span style={{ color: '#3B6D11', fontWeight: 500 }}>+{formatNum(n)}</span>
  : <span className="text-muted-foreground">—</span>
const issue = (n: number) => n > 0
  ? <span style={{ color: '#A32D2D', fontWeight: 500 }}>−{formatNum(n)}</span>
  : <span className="text-muted-foreground">—</span>

interface Props {
  items: StockPeriodItem[]
  fromDate: string
  midDate: string
  toDate: string
  loading?: boolean
}

function GroupTitle({ label, date, style }: { label: string; date: string; style: React.CSSProperties }) {
  return (
    <div style={style} className="-mx-2 -my-1 px-2 py-1 text-center">
      <div className="text-xs font-semibold">{label}</div>
      <div className="text-[10px] opacity-70">{date}</div>
    </div>
  )
}

export function StockPeriodTable({ items, fromDate, midDate, toDate, loading }: Props) {
  const t = useTranslations('admin.reports.stockPeriod')

  const numCell = (sep?: boolean) => (sep ? () => ({ style: { borderLeft: SEP } }) : undefined)

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
    {
      title: <GroupTitle label={t('grpOpen')} date={fromDate} style={GRP.open} />,
      onHeaderCell: () => ({ style: GRP.open }),
      children: [
        { title: t('colQty'), dataIndex: 'openQty', key: 'openQty', width: 90, align: 'right',
          onCell: numCell(true), onHeaderCell: () => ({ style: { borderLeft: SEP } }), render: qty },
        { title: t('colWeight'), dataIndex: 'openWeight', key: 'openWeight', width: 100, align: 'right', render: wgt },
      ],
    },
    {
      title: <GroupTitle label={t('grpChange')} date={`${fromDate} → ${toDate}`} style={GRP.change} />,
      onHeaderCell: () => ({ style: GRP.change }),
      children: [
        { title: t('colReceipt'), dataIndex: 'receiptQty', key: 'receiptQty', width: 90, align: 'right',
          onCell: numCell(true), onHeaderCell: () => ({ style: { borderLeft: SEP } }), render: recv },
        { title: t('colIssue'), dataIndex: 'issueQty', key: 'issueQty', width: 90, align: 'right', render: issue },
      ],
    },
    {
      title: <GroupTitle label={t('grpMid')} date={midDate} style={GRP.mid} />,
      onHeaderCell: () => ({ style: GRP.mid }),
      children: [
        { title: t('colQty'), dataIndex: 'midQty', key: 'midQty', width: 90, align: 'right',
          onCell: numCell(true), onHeaderCell: () => ({ style: { borderLeft: SEP } }), render: qty },
        { title: t('colWeight'), dataIndex: 'midWeight', key: 'midWeight', width: 100, align: 'right', render: wgt },
      ],
    },
    {
      title: <GroupTitle label={t('grpClose')} date={toDate} style={GRP.close} />,
      onHeaderCell: () => ({ style: GRP.close }),
      children: [
        { title: t('colQty'), dataIndex: 'closeQty', key: 'closeQty', width: 95, align: 'right',
          onCell: numCell(true), onHeaderCell: () => ({ style: { borderLeft: SEP } }),
          render: (n: number) => n > 0 ? <span className="font-semibold">{formatNum(n)}</span> : <span className="text-muted-foreground">—</span> },
        { title: t('colWeight'), dataIndex: 'closeWeight', key: 'closeWeight', width: 100, align: 'right', render: wgt },
      ],
    },
  ]

  const totals = items.reduce(
    (a, it) => ({
      openQty: a.openQty + it.openQty, openWeight: a.openWeight + it.openWeight,
      receiptQty: a.receiptQty + it.receiptQty, issueQty: a.issueQty + it.issueQty,
      midQty: a.midQty + it.midQty, midWeight: a.midWeight + it.midWeight,
      closeQty: a.closeQty + it.closeQty, closeWeight: a.closeWeight + it.closeWeight,
    }),
    { openQty: 0, openWeight: 0, receiptQty: 0, issueQty: 0, midQty: 0, midWeight: 0, closeQty: 0, closeWeight: 0 },
  )

  return (
    <Table<StockPeriodItem>
      rowKey={(r) => `${r.productId}-${r.branchId}`}
      columns={columns}
      dataSource={items}
      loading={loading}
      size="small"
      bordered
      sticky
      scroll={{ x: 1500, y: 460 }}
      pagination={false}
      locale={{ emptyText: t('empty') }}
      summary={() => (
        <Table.Summary fixed>
          <Table.Summary.Row style={{ background: 'var(--muted)', fontWeight: 600 }}>
            <Table.Summary.Cell index={0} colSpan={7}>
              {t('totalRow', { count: items.length })}
            </Table.Summary.Cell>
            <Table.Summary.Cell index={7} align="right">{formatNum(totals.openQty)}</Table.Summary.Cell>
            <Table.Summary.Cell index={8} align="right">{formatGram(totals.openWeight)}</Table.Summary.Cell>
            <Table.Summary.Cell index={9} align="right">
              <span style={{ color: '#3B6D11' }}>+{formatNum(totals.receiptQty)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={10} align="right">
              <span style={{ color: '#A32D2D' }}>−{formatNum(totals.issueQty)}</span>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={11} align="right">{formatNum(totals.midQty)}</Table.Summary.Cell>
            <Table.Summary.Cell index={12} align="right">{formatGram(totals.midWeight)}</Table.Summary.Cell>
            <Table.Summary.Cell index={13} align="right">{formatNum(totals.closeQty)}</Table.Summary.Cell>
            <Table.Summary.Cell index={14} align="right">{formatGram(totals.closeWeight)}</Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  )
}
