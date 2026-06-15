'use client'

import { useTranslations } from 'next-intl'
import { Table, Button as AntBtn } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import { /* FileSpreadsheet, Printer, Barcode, ShieldCheck, */ ExternalLink } from 'lucide-react'
import type { Transaction, TransactionItem } from '@/types/transaction'

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

export function TransactionExpandedRow({ record }: Props) {
  const t = useTranslations('admin.orders.expanded')

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
              <span style={{ color: '#0d9488', display: 'flex', alignItems: 'center', gap: 4 }}>
                {record.customer.name}
                <ExternalLink size={12} style={{ opacity: 0.6 }} />
              </span>
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
        </div>

        {/* Cột phải */}
        <div style={{ flex: 1, minWidth: 280 }}>
          <Field label={t('fieldSubtotal')}  value={formatKip(record.subtotalAmount)} />
          <Field label={t('fieldLaborFee')}  value={record.laborFee > 0 ? formatKip(record.laborFee) : '0'} />
          <Field label={t('fieldStoneFee')}  value={record.stoneFee > 0 ? formatKip(record.stoneFee) : '0'} />
          <Field label={t('fieldTotal')}     value={<b style={{ fontSize: 14, color: '#111827' }}>{formatKip(record.totalAmount)}</b>} />
          <Field label={t('fieldCounter')}   value={<b>{record.counterName}</b>} />
          <Field label={t('fieldCashier')}   value={<b>{record.cashierName}</b>} />
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

      {/* Nút hành động — tạm ẩn, chưa có tính năng
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <AntBtn icon={<FileSpreadsheet size={13} />}>{t('btnExport')}</AntBtn>
        <AntBtn icon={<ShieldCheck size={13} />}>{t('btnPrintGoldCert')}</AntBtn>
        <AntBtn type="primary" icon={<Printer size={13} />}>{t('btnRePrintInvoice')}</AntBtn>
        <AntBtn type="primary" icon={<Barcode size={13} />}>{t('btnPrintBarcode')}</AntBtn>
      </div>
      */}
    </div>
  )
}
