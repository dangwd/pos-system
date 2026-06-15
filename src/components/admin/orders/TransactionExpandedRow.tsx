'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import { ExternalLink } from 'lucide-react'
import type { Transaction, TransactionItem } from '@/types/transaction'
import { useCustomer } from '@/hooks/useCustomers'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

interface Props { record: Transaction }

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#111827',
  marginBottom: 12, paddingBottom: 6,
  borderBottom: '1px solid #f0f0f0',
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '4px 0', fontSize: 13 }}>
      <span style={{ minWidth: 150, color: '#6b7280', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 500, color: '#111827' }}>
        {value ?? <span style={{ color: '#d1d5db' }}>—</span>}
      </span>
    </div>
  )
}

function formatKip(n: number) { return n.toLocaleString('lo-LA') + ' ₭' }

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}

const TIER_LABELS: Record<string, string> = {
  silver: 'Bạc', gold: 'Vàng', platinum: 'Bạch kim',
}

function CustomerDetailBody({ customerId }: { customerId: string }) {
  const { data: c, isLoading } = useCustomer(customerId)

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <Spinner />
    </div>
  )
  if (!c) return <p style={{ color: '#6b7280', fontSize: 13 }}>Không tìm thấy khách hàng.</p>

  const rows: { label: string; value?: React.ReactNode }[] = [
    { label: 'Mã khách hàng', value: <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{c.id.slice(0, 10).toUpperCase()}</span> },
    { label: 'Tên', value: <b>{c.name}</b> },
    { label: 'Số điện thoại', value: c.phoneNumber || '—' },
    { label: 'Email', value: c.email || '—' },
    { label: 'Địa chỉ', value: ('address' in c && c.address) ? String(c.address) : '—' },
    { label: 'Ngày sinh', value: ('dateOfBirth' in c && c.dateOfBirth) ? String(c.dateOfBirth) : '—' },
    { label: 'Hạng thành viên', value: c.loyaltyTier ? TIER_LABELS[c.loyaltyTier] ?? c.loyaltyTier : '—' },
    { label: 'Điểm tích lũy', value: c.accumulatedPoints.toLocaleString('lo-LA') },
    { label: 'Tổng đơn hoàn tất', value: 'totalCompletedInvoices' in c ? String(c.totalCompletedInvoices) : '—' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
          <span style={{ minWidth: 160, color: '#6b7280', flexShrink: 0 }}>{r.label}</span>
          <span style={{ fontWeight: 500, color: '#111827' }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function CustomerDetailDialog({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  return (
    <Dialog open={customerId !== null} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thông tin khách hàng</DialogTitle>
        </DialogHeader>
        {customerId && <CustomerDetailBody customerId={customerId} />}
      </DialogContent>
    </Dialog>
  )
}

export function TransactionExpandedRow({ record }: Props) {
  const t = useTranslations('admin.orders.expanded')
  const [customerDialogId, setCustomerDialogId] = useState<string | null>(null)

  const productColumns: ColumnsType<TransactionItem> = [
    {
      title: t('colProductCode'), dataIndex: 'productId', width: 140,
      render: (v?: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>
          {v ? v.slice(0, 10).toUpperCase() : '—'}
        </span>
      ),
    },
    {
      title: t('colProductName'), dataIndex: 'productSnapshotName',
      render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span>,
    },
    {
      title: t('colUnit'), dataIndex: 'weightUnitName', width: 70,
      render: (v: string) => v || '—',
    },
    {
      title: t('colQty'), dataIndex: 'quantity', width: 70, align: 'right' as const,
      render: (v: number) => <b>{v}</b>,
    },
    {
      title: t('colWeight'), dataIndex: 'weightGram', width: 90, align: 'right' as const,
      render: (v: number) => v > 0 ? v.toLocaleString('lo-LA') : '—',
    },
    {
      title: t('colUnitPrice'), dataIndex: 'unitPriceLak', width: 140, align: 'right' as const,
      render: (v: number) => formatKip(v),
    },
    {
      title: t('colLineTotal'), dataIndex: 'lineTotal', width: 140, align: 'right' as const,
      render: (v: number) => <b style={{ color: '#111827' }}>{formatKip(v)}</b>,
    },
  ]

  return (
    <div style={{ padding: '16px 16px 16px 48px', background: '#f8faff' }}>
      <div style={SECTION_LABEL_STYLE}>{t('sectionInfo')}</div>

      {/* Thông tin 2 cột */}
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', marginBottom: 16 }}>
        {/* Cột trái */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <Field label={t('fieldInvoiceCode')} value={
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{record.invoiceCode}</span>
          } />
          <Field label={t('fieldCustomerCode')} value={record.customer?.id
            ? <span style={{ fontFamily: 'monospace' }}>{record.customer.id.slice(0, 10).toUpperCase()}</span>
            : undefined
          } />
          <Field label={t('fieldCustomerName')} value={record.customer?.name
            ? (
              <button
                onClick={() => setCustomerDialogId(record.customer!.id)}
                style={{
                  color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: 0, fontWeight: 500, fontSize: 'inherit',
                }}
              >
                {record.customer.name}
                <ExternalLink size={12} style={{ opacity: 0.6 }} />
              </button>
            )
            : undefined
          } />
          <Field label={t('fieldPhone')} value={
            record.customer?.phoneNumber
              ? <b>{record.customer.phoneNumber}</b>
              : undefined
          } />
          <Field label={t('fieldCreatedAt')} value={
            <b>{formatDatetime(record.transactedAt)}</b>
          } />
          <Field label={t('fieldCounter')}   value={<b>{record.counterName}</b>} />
          <Field label={t('fieldCashier')}   value={<b>{record.cashierName}</b>} />
        </div>

        {/* Cột phải */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <Field label={t('fieldSubtotal')}  value={formatKip(record.subtotalAmount)} />
          <Field label={t('fieldLaborFee')}  value={record.laborFee > 0 ? formatKip(record.laborFee) : '0'} />
          <Field label={t('fieldStoneFee')}  value={record.stoneFee > 0 ? formatKip(record.stoneFee) : '0'} />
          <Field label={t('fieldTotal')}     value={<b style={{ fontSize: 14, color: '#111827' }}>{formatKip(record.totalAmount)}</b>} />
          <Field label={t('fieldCash')}      value={record.cashAmount != null ? formatKip(record.cashAmount) : undefined} />
          <Field label={t('fieldBank')}      value={record.bankAmount != null ? formatKip(record.bankAmount) : undefined} />
        </div>
      </div>

      {/* Bảng sản phẩm */}
      {record.items.length > 0 && (
        <Table<TransactionItem>
          rowKey="id"
          dataSource={record.items}
          columns={productColumns}
          size="small"
          bordered
          pagination={false}
          style={{ marginBottom: 12 }}
        />
      )}

      <CustomerDetailDialog
        customerId={customerDialogId}
        onClose={() => setCustomerDialogId(null)}
      />
    </div>
  )
}
