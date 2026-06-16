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

const TYPE_BADGE_STYLE: Record<string, React.CSSProperties> = {
  SellGold:        { background: '#dcfce7', color: '#15803d' },
  SellSilver:      { background: '#ccfbf1', color: '#0f766e' },
  BuyGold:         { background: '#dbeafe', color: '#1d4ed8' },
  BuyMoreGold:     { background: '#dbeafe', color: '#1d4ed8' },
  ExchangeGold:    { background: '#fef3c7', color: '#b45309' },
  ExchangeFree:    { background: '#fef3c7', color: '#b45309' },
  ExchangeToMoney: { background: '#e0e7ff', color: '#4338ca' },
  ExchangeCurrency:{ background: '#ede9fe', color: '#7c3aed' },
}

const STATUS_BADGE_STYLE: Record<string, React.CSSProperties> = {
  Completed: { background: '#dcfce7', color: '#15803d' },
  Cancelled: { background: '#fee2e2', color: '#dc2626' },
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

const BADGE_BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center',
  fontSize: 11, fontWeight: 700,
  padding: '2px 8px', borderRadius: 4,
}

// Loại GD có thành phần "mua vàng cũ" — hiển thị phí lỗi hỏng & hao mòn thay vì gia công/đá
const BUY_TYPES = new Set(['BuyGold', 'BuyMoreGold', 'ExchangeGold', 'ExchangeFree', 'ExchangeToMoney'])

/** Parse phiKho và haoHutChi được encode trong productSnapshotName.
 *  Format: "Tên SP [PHÍ KHÒ: 1.500.000₭ | HAO HỤT: 0.4 Chỉ]"
 */
function parseItemFees(name: string): { cleanName: string; phiKho: number; haoHutChi: number } {
  const m = name.match(/^(.*?)\s*\[PHÍ KHÒ:\s*([\d.,]+)₭\s*\|\s*HAO HỤT:\s*([\d.,]+)\s*Chỉ\]$/)
  if (!m) return { cleanName: name, phiKho: 0, haoHutChi: 0 }
  return {
    cleanName: m[1].trim(),
    phiKho: parseInt(m[2].replace(/[.,]/g, ''), 10),
    haoHutChi: parseFloat(m[3]),
  }
}

export function TransactionExpandedRow({ record }: Props) {
  const t = useTranslations('admin.orders.expanded')
  const tOrders = useTranslations('admin.orders')
  const [customerDialogId, setCustomerDialogId] = useState<string | null>(null)

  const typeLabel = tOrders(`transactionTypes.${record.type}`)
  const typeBadgeStyle = TYPE_BADGE_STYLE[record.type] ?? { background: '#f3f4f6', color: '#374151' }
  const statusLabel = tOrders(`transactionStatuses.${record.status}.label`)
  const statusBadgeStyle = STATUS_BADGE_STYLE[record.status] ?? { background: '#f3f4f6', color: '#374151' }

  const isBuyType = BUY_TYPES.has(record.type)

  // Parse encoded fees từ tên sản phẩm — tính tổng để hiện ở cột info
  const parsedItems = record.items.map(item => ({
    ...parseItemFees(item.productSnapshotName),
    unitPriceLak: item.unitPriceLak,
    tableUnitPriceLak: item.tableUnitPriceLak,
    weightGram: item.weightGram,
  }))
  const hasEncodedFees = parsedItems.some(p => p.phiKho > 0 || p.haoHutChi > 0)
  const totalPhiKho = parsedItems.reduce((s, p) => s + p.phiKho, 0)
  const totalHaoHutValue = parsedItems.reduce((s, p) => {
    const pricePerUnit = p.tableUnitPriceLak || p.unitPriceLak
    const gramPerUnit = p.weightGram > 0 ? p.weightGram : 3.75
    return s + Math.round(p.haoHutChi * pricePerUnit / gramPerUnit * 3.75)
  }, 0)

  const productColumns: ColumnsType<TransactionItem> = [
    {
      title: '', dataIndex: 'itemRole', width: 28,
      render: (v: string) => v === 'ExchangeIn'
        ? <span title={t('labelExchangeIn')} style={{ ...BADGE_BASE, background: '#dbeafe', color: '#1d4ed8', fontSize: 10 }}>↩</span>
        : null,
    },
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
      render: (v: string, row: TransactionItem) => {
        const { cleanName } = parseItemFees(v)
        return <span style={{ fontSize: 13, color: row.itemRole === 'ExchangeIn' ? '#1d4ed8' : undefined }}>{cleanName}</span>
      },
    },
    {
      title: t('colUnit'), dataIndex: 'weightUnitName', width: 70,
      render: (v: string) => v || '—',
    },
    {
      title: t('colQty'), dataIndex: 'quantity', width: 90, align: 'right' as const,
      render: (v: number) => <b>{v}</b>,
    },
    // Cột lỗi/hỏng và hao mòn — chỉ hiện khi có ít nhất 1 item mang phiKho/haoHut
    ...(hasEncodedFees ? [
      {
        title: t('colDamageFee'), dataIndex: 'productSnapshotName', key: 'phiKho',
        width: 110, align: 'right' as const,
        render: (v: string) => {
          const { phiKho } = parseItemFees(v)
          return phiKho > 0 ? formatKip(phiKho) : <span style={{ color: '#d1d5db' }}>—</span>
        },
      },
      {
        title: t('colWearChi'), dataIndex: 'productSnapshotName', key: 'haoHutChi',
        width: 90, align: 'right' as const,
        render: (v: string) => {
          const { haoHutChi } = parseItemFees(v)
          return haoHutChi > 0
            ? <span>{haoHutChi.toLocaleString('lo-LA')} Chỉ</span>
            : <span style={{ color: '#d1d5db' }}>—</span>
        },
      },
      {
        title: t('colWearValue'), dataIndex: 'productSnapshotName', key: 'haoHutValue',
        width: 120, align: 'right' as const,
        render: (v: string, row: TransactionItem) => {
          const { haoHutChi } = parseItemFees(v)
          if (haoHutChi <= 0) return <span style={{ color: '#d1d5db' }}>—</span>
          const pricePerUnit = row.tableUnitPriceLak || row.unitPriceLak
          const gramPerUnit = row.weightGram > 0 ? row.weightGram : 3.75
          const val = Math.round(haoHutChi * pricePerUnit / gramPerUnit * 3.75)
          return formatKip(val)
        },
      },
    ] as ColumnsType<TransactionItem> : []),
    {
      title: t('colUnitPrice'), dataIndex: 'tableUnitPriceLak', width: 140, align: 'right' as const,
      render: (v: number, row: TransactionItem) => formatKip(v || row.unitPriceLak),
    },
    {
      title: t('colLineTotal'), dataIndex: 'lineTotal', width: 140, align: 'right' as const,
      render: (v: number) => <b style={{ color: '#111827' }}>{formatKip(v)}</b>,
    },
  ]

  return (
    <div style={{ padding: '16px 24px 20px', background: '#f8faff' }}>
      {/* Header: tiêu đề + type badge + status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{t('sectionInfo')}</span>
        <span style={{ ...BADGE_BASE, ...typeBadgeStyle }}>{typeLabel}</span>
        <span style={{ ...BADGE_BASE, ...statusBadgeStyle }}>{statusLabel}</span>
      </div>

      {/* Cancel info */}
      {record.status === 'Cancelled' && (record.cancelledAt || record.cancelReason) && (
        <div style={{ marginBottom: 14, padding: '8px 14px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca', fontSize: 12 }}>
          {record.cancelledAt && (
            <div style={{ color: '#991b1b' }}>
              <b>{t('fieldCancelledAt')}:</b> {formatDatetime(record.cancelledAt)}
            </div>
          )}
          {record.cancelReason && (
            <div style={{ color: '#991b1b', marginTop: record.cancelledAt ? 2 : 0 }}>
              <b>{t('fieldCancelReason')}:</b> {record.cancelReason}
            </div>
          )}
        </div>
      )}

      {/* Thông tin 2 cột */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 16 }}>
        {/* Cột trái */}
        <div style={{ flex: 1, minWidth: 260 }}>
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
          <Field label={t('fieldCreatedAt')} value={<b>{formatDatetime(record.transactedAt)}</b>} />
          <Field label={t('fieldCounter')} value={<b>{record.counterName}</b>} />
          <Field label={t('fieldCashier')} value={<b>{record.cashierName}</b>} />
        </div>

        {/* Cột phải — phân biệt loại GD mua vàng vs bán vàng */}
        <div style={{ flex: 1, minWidth: 260 }}>
          {record.type === 'ExchangeCurrency' ? (
            <>
              {record.currency && record.exchangeRate && record.exchangeRate > 0 && (
                <Field
                  label="Tiền khách đưa"
                  value={<b>{Math.round(record.totalAmount / record.exchangeRate).toLocaleString('lo-LA')} {record.currency}</b>}
                />
              )}
              {record.exchangeRate && record.exchangeRate > 0 && (
                <Field
                  label="Tỷ giá quy đổi"
                  value={<span style={{ fontVariantNumeric: 'tabular-nums' }}>{record.exchangeRate.toLocaleString('lo-LA')}</span>}
                />
              )}
              {record.targetCurrency && record.targetAmount != null ? (
                <Field
                  label="Tiền trả khách"
                  value={<b>{record.targetCurrency === 'LAK' ? formatKip(record.targetAmount) : `${record.targetAmount.toLocaleString('lo-LA')} ${record.targetCurrency}`}</b>}
                />
              ) : (
                <Field label="Tiền trả khách" value={<b>{formatKip(record.totalAmount)}</b>} />
              )}
            </>
          ) : (
            <Field label={t('fieldSubtotal')} value={formatKip(record.subtotalAmount)} />
          )}
          {isBuyType ? (
            <>
              {hasEncodedFees && (
                <Field label={t('fieldTotalDamageFee')} value={totalPhiKho > 0 ? formatKip(totalPhiKho) : '0'} />
              )}
              {hasEncodedFees && (
                <Field label={t('fieldTotalWearValue')} value={totalHaoHutValue > 0 ? formatKip(totalHaoHutValue) : '0'} />
              )}
              {record.laborFee > 0 && (
                <Field label={t('fieldLaborFee')} value={formatKip(record.laborFee)} />
              )}
            </>
          ) : (
            <>
              <Field label={t('fieldLaborFee')} value={record.laborFee > 0 ? formatKip(record.laborFee) : '0'} />
              <Field label={t('fieldStoneFee')} value={record.stoneFee > 0 ? formatKip(record.stoneFee) : '0'} />
            </>
          )}
          <Field label={t('fieldTotal')} value={<b style={{ fontSize: 14 }}>{formatKip(record.totalAmount)}</b>} />
          <Field label={t('fieldCash')}  value={record.cashAmount != null ? formatKip(record.cashAmount) : undefined} />
          <Field label={t('fieldBank')}  value={record.bankAmount != null ? formatKip(record.bankAmount) : undefined} />
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
          rowClassName={r => r.itemRole === 'ExchangeIn' ? 'exchange-in-row' : ''}
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
