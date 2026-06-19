'use client'

import { useTranslations } from 'next-intl'
import { Table, Spin } from 'antd'
import type { TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { TransactionExpandedRow } from '@/components/admin/orders/TransactionExpandedRow'
import { formatKip, formatNum } from '@/components/admin/reports/report-ui'
import { useTransactionById } from '@/hooks/useTransactions'
import { useInventoryAdjustment } from '@/hooks/useInventory'
import type { InventoryAdjustmentLine } from '@/types/inventory'

export interface DocRef {
  refType: 'Transaction' | 'Adjustment'
  refId: string
  refCode: string
}

function AdjustmentView({ id }: { id: string }) {
  const t = useTranslations('admin.reports.stockPeriod')
  const { data: adj, isLoading } = useInventoryAdjustment(id)

  if (isLoading) return <div className="py-6 text-center"><Spin size="small" /></div>
  if (!adj) return null

  const meta: { label: string; value: React.ReactNode }[] = [
    { label: t('adjDirection'), value: (
      <Badge variant={adj.direction === 'IN' ? 'default' : 'destructive'}>
        {adj.direction === 'IN' ? t('movIn') : t('movOut')}
      </Badge>
    ) },
    { label: t('adjBranch'), value: adj.branchName },
    { label: t('adjCounter'), value: adj.counterName ?? '—' },
    { label: t('adjReason'), value: adj.reason || '—' },
    { label: t('adjCreatedAt'), value: dayjs(adj.createdAt).format('DD/MM/YYYY HH:mm') },
    { label: t('adjSupplier'), value: adj.supplier || '—' },
    { label: t('adjTotal'), value: adj.totalValue != null ? formatKip(adj.totalValue) : '—' },
  ]

  const cols: TableColumnsType<InventoryAdjustmentLine> = [
    { title: t('colCode'), dataIndex: 'productCode', key: 'productCode', width: 110,
      render: (v: string) => <span className="font-mono text-xs text-muted-foreground">{v}</span> },
    { title: t('colName'), dataIndex: 'productName', key: 'productName',
      render: (v: string) => <span className="font-medium">{v}</span> },
    { title: t('colKarat'), dataIndex: 'purity', key: 'purity', width: 90,
      render: (v: string | null) => v ?? '—' },
    { title: t('adjLineQty'), dataIndex: 'quantity', key: 'quantity', width: 90, align: 'right',
      render: (v: number) => formatNum(v) },
  ]

  return (
    <div className="space-y-3">
      <div className="max-w-2xl">
        {meta.map((m, i) => (
          <div key={i} className="flex items-center border-b border-dashed py-1 text-sm">
            <span className="text-muted-foreground w-1/2">{m.label}</span>
            <span className="font-medium w-1/2">{m.value}</span>
          </div>
        ))}
      </div>
      <Table<InventoryAdjustmentLine>
        rowKey="id" columns={cols} dataSource={adj.lines}
        size="small" bordered pagination={false} scroll={{ x: 420, y: 13 * 39 }}
      />
    </div>
  )
}

function TransactionView({ id }: { id: string }) {
  const { data: tx, isLoading } = useTransactionById(id)
  if (isLoading) return <div className="py-6 text-center"><Spin size="small" /></div>
  if (!tx) return null
  return <TransactionExpandedRow record={tx} />
}

export function DocumentDialog({ doc, onClose }: { doc: DocRef | null; onClose: () => void }) {
  const t = useTranslations('admin.reports.stockPeriod')
  const title = doc
    ? `${doc.refType === 'Transaction' ? t('docTxTitle') : t('docAdjTitle')} · ${doc.refCode}`
    : ''

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl" title={title}>
        {doc?.refType === 'Transaction' && <TransactionView id={doc.refId} />}
        {doc?.refType === 'Adjustment' && <AdjustmentView id={doc.refId} />}
      </DialogContent>
    </Dialog>
  )
}
