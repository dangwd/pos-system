'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import { ExportOutlined } from '@ant-design/icons'
import type { Transaction, TransactionItem, ExchangeLineResponse } from '@/types/transaction'
import { useCustomer } from '@/hooks/useCustomers'
import { calcWearValue } from '@/lib/pricing'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

interface Props { record: Transaction }

const TYPE_BADGE_STYLE: Record<string, React.CSSProperties> = {
  SellGold:        { background: '#dcfce7', color: '#15803d' },
  SellSilver:      { background: '#ccfbf1', color: '#0f766e' },
  BuyGold:         { background: '#dbeafe', color: '#1d4ed8' },
  BuySilver:       { background: '#f1f5f9', color: '#334155' },
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

// Loại GD có thành phần "mua vàng cũ" — hiển thị phí lỗi hỏng & hao mòn
const BUY_TYPES = new Set(['BuyGold', 'BuySilver', 'BuyMoreGold', 'ExchangeGold', 'ExchangeFree', 'ExchangeToMoney'])
// Loại đổi hàng — có cả ExchangeIn (mua) và Normal (bán) nên cần cả hai bộ cột
const EXCHANGE_TYPES = new Set(['ExchangeGold', 'ExchangeFree', 'BuyMoreGold', 'ExchangeToMoney'])

export function TransactionExpandedRow({ record }: Props) {
  const t = useTranslations('admin.orders.expanded')
  const tOrders = useTranslations('admin.orders')
  const [customerDialogId, setCustomerDialogId] = useState<string | null>(null)

  const typeLabel = tOrders(`transactionTypes.${record.type}`)
  const typeBadgeStyle = TYPE_BADGE_STYLE[record.type] ?? { background: '#f3f4f6', color: '#374151' }
  const statusLabel = tOrders(`transactionStatuses.${record.status}.label`)
  const statusBadgeStyle = STATUS_BADGE_STYLE[record.status] ?? { background: '#f3f4f6', color: '#374151' }

  const isBuyType = BUY_TYPES.has(record.type)
  const isExchangeType = EXCHANGE_TYPES.has(record.type)
  const isFxType = record.type === 'ExchangeCurrency'
  const isSilverBuy = record.type === 'BuySilver'

  const hasBuyFees = isBuyType && record.items.some(i => (i.phiHuHai ?? 0) > 0 || (i.haoHutGram ?? 0) > 0)
  const totalPhiKho = record.items.reduce((s, i) => s + (i.phiHuHai ?? 0), 0)
  const totalHaoHutValue = record.items.reduce((s, i) => {
    // weightGram backend trả về đã trừ hao mòn → calcWearValue khôi phục
    // trọng lượng gốc trước khi suy giá/gram (khớp với cột "Giá trị HM").
    return s + calcWearValue({
      unitPriceLak: i.unitPriceLak,
      quantity: i.quantity,
      weightGram: i.weightGram,
      wearGram: i.haoHutGram ?? 0,
    })
  }, 0)

  const productColumns: ColumnsType<TransactionItem> = [
    {
      title: '', dataIndex: 'itemRole', width: 28, fixed: 'left',
      render: (v: string) => v === 'ExchangeIn'
        ? <span title={t('labelExchangeIn')} style={{ ...BADGE_BASE, background: '#dbeafe', color: '#1d4ed8', fontSize: 10 }}>↩</span>
        : null,
    },
    {
      title: '#', key: 'index', width: 40, align: 'center' as const, fixed: 'left',
      render: (_: unknown, __: TransactionItem, index: number) => (
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{index + 1}</span>
      ),
    },
    {
      title: t('colProductCode'), dataIndex: 'productId', width: 140, fixed: 'left',
      render: (v?: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4f46e5' }}>
          {v ? v.slice(0, 10).toUpperCase() : '—'}
        </span>
      ),
    },
    {
      title: t('colProductName'), dataIndex: 'productSnapshotName', width: 200, fixed: 'left',
      render: (v: string, row: TransactionItem) => (
        <span style={{ fontSize: 13, color: row.itemRole === 'ExchangeIn' ? '#1d4ed8' : undefined }}>{v}</span>
      ),
    },
    {
      title: t('colQty'), dataIndex: 'quantity', width: 90, align: 'right' as const,
      render: (v: number) => <b>{v}</b>,
    },
    {
      title: t('colUnit'), dataIndex: 'weightUnitName', width: 90,
      render: (v: string) => v || '—',
    },
    {
      title: t('colUnitPrice'), dataIndex: 'unitPriceLak', width: 130, align: 'right' as const,
      render: (v: number) => formatKip(v),
    },
    // Cột mua vàng cũ: lỗi hỏng + hao mòn (BuyGold & ExchangeIn rows)
    ...(isBuyType ? [
      {
        title: t('colDamageFee'), dataIndex: 'phiHuHai', key: 'phiKho',
        width: 120, align: 'right' as const,
        render: (v: number | undefined, row: TransactionItem) => {
          if (isExchangeType && row.itemRole !== 'ExchangeIn') return <span style={{ color: '#d1d5db' }}>—</span>
          return (v ?? 0) > 0 ? formatKip(v!) : <span style={{ color: '#d1d5db' }}>—</span>
        },
      },
      {
        title: t('colWearChi'), key: 'haoHutChi',
        width: 100, align: 'right' as const,
        render: (_: unknown, row: TransactionItem) => {
          if (isExchangeType && row.itemRole !== 'ExchangeIn') return <span style={{ color: '#d1d5db' }}>—</span>
          const haoHutGram = row.haoHutGram ?? 0
          if (haoHutGram <= 0) return <span style={{ color: '#d1d5db' }}>—</span>
          // Bạc hiển thị hao mòn theo Gram, vàng theo Chỉ (÷3.75)
          return isSilverBuy
            ? <span>{haoHutGram.toLocaleString('lo-LA')} {t('weightUnitGram')}</span>
            : <span>{(haoHutGram / 3.75).toLocaleString('lo-LA')} {t('weightUnit')}</span>
        },
      },
      {
        title: t('colWearValue'), key: 'haoHutValue',
        width: 130, align: 'right' as const,
        render: (_: unknown, row: TransactionItem) => {
          if (isExchangeType && row.itemRole !== 'ExchangeIn') return <span style={{ color: '#d1d5db' }}>—</span>
          const haoHutGram = row.haoHutGram ?? 0
          if (haoHutGram <= 0 || row.weightGram <= 0 || row.quantity <= 0) return <span style={{ color: '#d1d5db' }}>—</span>
          // weightGram backend trả về đã trừ hao mòn → calcWearValue khôi phục
          // trọng lượng gốc trước khi suy giá/gram (tránh thổi phồng giá trị hao mòn).
          const val = calcWearValue({
            unitPriceLak: row.unitPriceLak,
            quantity: row.quantity,
            weightGram: row.weightGram,
            wearGram: haoHutGram,
          })
          return formatKip(val)
        },
      },
    ] as ColumnsType<TransactionItem> : []),
    // Cột bán hàng mới: tiền công + tiền đá (SellGold/SellSilver và Normal rows trong Exchange)
    ...(!isBuyType || isExchangeType ? [
      {
        title: t('colLaborFee'), dataIndex: 'laborFee', key: 'laborFee',
        width: 110, align: 'right' as const,
        render: (v: number, row: TransactionItem) => {
          if (isExchangeType && row.itemRole === 'ExchangeIn') return <span style={{ color: '#d1d5db' }}>—</span>
          return v > 0 ? formatKip(v) : <span style={{ color: '#d1d5db' }}>—</span>
        },
      },
      {
        title: t('colStoneFee'), dataIndex: 'stoneFee', key: 'stoneFee',
        width: 110, align: 'right' as const,
        render: (v: number, row: TransactionItem) => {
          if (isExchangeType && row.itemRole === 'ExchangeIn') return <span style={{ color: '#d1d5db' }}>—</span>
          return v > 0 ? formatKip(v) : <span style={{ color: '#d1d5db' }}>—</span>
        },
      },
    ] as ColumnsType<TransactionItem> : []),
    {
      title: t('colLineTotal'), dataIndex: 'lineTotal', width: 140, align: 'right' as const,
      render: (v: number) => <b style={{ color: '#111827' }}>{formatKip(v)}</b>,
    },
  ]

  const fxColumns: ColumnsType<ExchangeLineResponse> = [
    {
      title: '#', key: 'fxIdx', width: 40, align: 'center' as const,
      render: (_: unknown, __: ExchangeLineResponse, i: number) => (
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</span>
      ),
    },
    {
      title: t('colFxPair'), key: 'fxPair', width: 160,
      render: (_: unknown, row: ExchangeLineResponse) => (
        <span style={{ fontWeight: 600, fontSize: 13 }}>
          {row.fromCurrency} <span style={{ color: '#9ca3af' }}>→</span> {row.toCurrency}
        </span>
      ),
    },
    {
      title: t('colFxFrom'), key: 'fxFrom', align: 'right' as const,
      render: (_: unknown, row: ExchangeLineResponse) => (
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {row.fromAmount.toLocaleString('lo-LA')} {row.fromCurrency}
        </span>
      ),
    },
    {
      title: t('colFxRate'), key: 'fxRate', align: 'right' as const, width: 200,
      render: (_: unknown, row: ExchangeLineResponse) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, color: '#6b7280' }}>
          1 {row.fromCurrency} = {row.fromRateToLak.toLocaleString('lo-LA')} ₭
        </span>
      ),
    },
    {
      title: t('colLineTotal'), key: 'fxTo', align: 'right' as const, width: 160,
      render: (_: unknown, row: ExchangeLineResponse) => {
        const toAmt = row.toAmount != null
          ? row.toAmount
          : row.toRateToLak > 0
            ? Math.round(row.fromAmount * row.fromRateToLak / row.toRateToLak * 10000) / 10000
            : 0
        return row.toCurrency === 'LAK'
          ? <b style={{ color: '#111827' }}>{formatKip(Math.round(toAmt))}</b>
          : <b style={{ color: '#111827' }}>{toAmt.toLocaleString('lo-LA', { maximumFractionDigits: 4 })} {row.toCurrency}</b>
      },
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
                <ExportOutlined style={{ fontSize: 12, opacity: 0.6 }} />
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
            record.exchangeLines?.length ? (
              // Multi-line FX: mỗi leg là 1 Field row
              <>
                {record.exchangeLines.map((l, i) => {
                  const toAmt = l.toAmount != null
                    ? l.toAmount
                    : l.toRateToLak > 0
                      ? Math.round(l.fromAmount * l.fromRateToLak / l.toRateToLak * 10000) / 10000
                      : 0
                  const toFmt = l.toCurrency === 'LAK'
                    ? formatKip(Math.round(toAmt))
                    : `${toAmt.toLocaleString('lo-LA', { maximumFractionDigits: 4 })} ${l.toCurrency}`
                  return (
                    <Field key={i}
                      label={`${l.fromCurrency} → ${l.toCurrency}`}
                      value={
                        <span>
                          <span style={{ color: '#6b7280', fontWeight: 400 }}>
                            {l.fromAmount.toLocaleString('lo-LA')} {l.fromCurrency}
                          </span>
                          {' → '}
                          <b>{toFmt}</b>
                        </span>
                      }
                    />
                  )
                })}
              </>
            ) : (
              // Scalar fallback (legacy / single-pair)
              <>
                {record.currency && record.exchangeRate && record.exchangeRate > 0 && (
                  <Field
                    label={t('fieldCustomerGives')}
                    value={<b>{Math.round(record.totalAmount / record.exchangeRate).toLocaleString('lo-LA')} {record.currency}</b>}
                  />
                )}
                {record.exchangeRate && record.exchangeRate > 0 && (
                  <Field
                    label={t('fieldExchangeRate')}
                    value={<span style={{ fontVariantNumeric: 'tabular-nums' }}>{record.exchangeRate.toLocaleString('lo-LA')}</span>}
                  />
                )}
                {record.targetCurrency && record.targetAmount != null ? (
                  <Field
                    label={t('fieldCustomerReceives')}
                    value={<b>{record.targetCurrency === 'LAK' ? formatKip(record.targetAmount) : `${record.targetAmount.toLocaleString('lo-LA')} ${record.targetCurrency}`}</b>}
                  />
                ) : (
                  <Field label={t('fieldCustomerReceives')} value={<b>{formatKip(record.totalAmount)}</b>} />
                )}
              </>
            )
          ) : (
            <Field label={t('fieldSubtotal')} value={formatKip(record.subtotalAmount)} />
          )}
          {isBuyType ? (
            <>
              {hasBuyFees && (
                <Field label={t('fieldTotalDamageFee')} value={totalPhiKho > 0 ? formatKip(totalPhiKho) : '0'} />
              )}
              {hasBuyFees && (
                <Field label={t('fieldTotalWearValue')} value={totalHaoHutValue > 0 ? formatKip(totalHaoHutValue) : '0'} />
              )}
              {record.laborFee > 0 && (
                <Field label={t('fieldLaborFee')} value={formatKip(record.laborFee)} />
              )}
            </>
          ) : record.type !== 'ExchangeCurrency' ? (
            <>
              <Field label={t('fieldLaborFee')} value={record.laborFee > 0 ? formatKip(record.laborFee) : '0'} />
              <Field label={t('fieldStoneFee')} value={record.stoneFee > 0 ? formatKip(record.stoneFee) : '0'} />
            </>
          ) : null}
          <Field label={t('fieldTotal')} value={<b style={{ fontSize: 14 }}>{formatKip(record.totalAmount)}</b>} />
          {record.type !== 'ExchangeCurrency' && (
            <>
              <Field label={t('fieldCash')}  value={record.cashAmount != null ? formatKip(record.cashAmount) : undefined} />
              <Field label={t('fieldBank')}  value={record.bankAmount != null ? formatKip(record.bankAmount) : undefined} />
            </>
          )}
        </div>
      </div>

      {/* Bảng giao dịch */}
      {isFxType ? (
        record.exchangeLines?.length ? (
          <Table<ExchangeLineResponse>
            rowKey={(_r, i) => String(i)}
            dataSource={record.exchangeLines}
            columns={fxColumns}
            size="small"
            bordered
            pagination={false}
            scroll={{ x: 700 }}
            style={{ marginBottom: 12 }}
          />
        ) : record.items.length > 0 ? (
          <Table<TransactionItem>
            rowKey="id"
            dataSource={record.items}
            columns={[
              {
                title: '#', key: 'fxIdx', width: 40, align: 'center' as const,
                render: (_: unknown, __: TransactionItem, i: number) => (
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</span>
                ),
              },
              {
                title: t('colFxCurrency'), dataIndex: 'productSnapshotName',
                render: (v: string) => <span style={{ fontSize: 13 }}>{v}</span>,
              },
              {
                title: t('colLineTotal'), dataIndex: 'lineTotal', align: 'right' as const, width: 160,
                render: (v: number, row: TransactionItem) => {
                  if (row.fxToCurrency && row.fxToAmount != null) {
                    return row.fxToCurrency === 'LAK'
                      ? <b style={{ color: '#111827' }}>{formatKip(Math.round(row.fxToAmount))}</b>
                      : <b style={{ color: '#111827' }}>{row.fxToAmount.toLocaleString('lo-LA', { maximumFractionDigits: 4 })} {row.fxToCurrency}</b>
                  }
                  return <b style={{ color: '#111827' }}>{formatKip(v)}</b>
                },
              },
            ]}
            size="small"
            bordered
            pagination={false}
            style={{ marginBottom: 12 }}
          />
        ) : null
      ) : record.items.length > 0 ? (
        <Table<TransactionItem>
          rowKey="id"
          dataSource={record.items}
          columns={productColumns}
          size="small"
          bordered
          pagination={false}
          scroll={{ x: 1400 }}
          rowClassName={r => r.itemRole === 'ExchangeIn' ? 'exchange-in-row' : ''}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <CustomerDetailDialog
        customerId={customerDialogId}
        onClose={() => setCustomerDialogId(null)}
      />
    </div>
  )
}
