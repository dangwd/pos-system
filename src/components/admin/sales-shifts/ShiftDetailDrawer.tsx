'use client'

import { useShiftDetail, useShiftTransactions } from '@/hooks/useSalesShift'
import type { ShiftDenominationEntry, ShiftTransactionItem } from '@/types/sales-shift'
import { Drawer, Table, Tabs, Tag, Tooltip } from 'antd'
import type { TableColumnsType } from 'antd'
import { Spinner } from '@/components/ui/spinner'

interface Props {
  shiftId: string | null
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Badge styles theo nghiepVu ───────────────────────────────────────────────

const NGHIEP_VU_COLOR: Record<string, string> = {
  'Bán hàng':         'green',
  'Mua hàng':         'blue',
  'Đổi hàng':         'gold',
  'Đổi thành tiền':   'purple',
  'Thu đổi ngoại tệ': 'volcano',
  'Mua thêm':         'geekblue',
  'Đổi miễn phí':     'lime',
}

const HINH_THUC_COLOR: Record<string, string> = {
  CASH:     'green',
  BANK:     'blue',
  COMBINED: 'purple',
}

// ─── DenomTable ──────────────────────────────────────────────────────────────

function DenomTable({
  entries,
  currency,
  hasClosing,
}: {
  entries: ShiftDenominationEntry[]
  currency: string
  hasClosing: boolean
}) {
  const active = entries.filter(e => (e.openingQuantity ?? 0) > 0 || (e.closingQuantity ?? 0) > 0)
  if (active.length === 0) return null

  const openingTotal = active.reduce((s, e) => s + e.value * (e.openingQuantity ?? 0), 0)
  const closingTotal = active.reduce((s, e) => s + e.value * (e.closingQuantity ?? 0), 0)
  const cols = hasClosing ? '1fr 72px 72px' : '1fr 72px'

  return (
    <div style={{ margin: '4px 0 10px', padding: '6px 10px', background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, letterSpacing: '0.05em' }}>MỆNH GIÁ</span>
        <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textAlign: 'right' }}>ĐẦU CA</span>
        {hasClosing && <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textAlign: 'right' }}>CUỐI CA</span>}
      </div>
      {active.map(e => (
        <div key={e.value} style={{ display: 'grid', gridTemplateColumns: cols, gap: 4, padding: '2px 0', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 12, color: '#374151' }}>{e.value.toLocaleString('lo-LA')} {currency}</span>
          <span style={{ fontSize: 12, textAlign: 'right', color: '#111827' }}>
            {e.openingQuantity != null ? `×${e.openingQuantity}` : '—'}
          </span>
          {hasClosing && (
            <span style={{ fontSize: 12, textAlign: 'right', color: '#111827' }}>
              {e.closingQuantity != null ? `×${e.closingQuantity}` : '—'}
            </span>
          )}
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 4, padding: '4px 0 0', borderTop: '1px solid #e5e7eb', marginTop: 2 }}>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Tổng</span>
        <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#4f46e5' }}>
          {openingTotal.toLocaleString('lo-LA')}
        </span>
        {hasClosing && (
          <span style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', color: '#4f46e5' }}>
            {closingTotal.toLocaleString('lo-LA')}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────

function SummaryRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '7px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13,
    }}>
      <span style={{ color: '#6b7280' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: highlight ? '#111827' : '#374151' }}>
        {value}
      </span>
    </div>
  )
}

// ─── Tab: Tổng quan ──────────────────────────────────────────────────────────

function SummaryTab({ shiftId }: { shiftId: string }) {
  const { data, isLoading } = useShiftDetail(shiftId)

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spinner />
    </div>
  )
  if (!data) return null

  const s = data.summary

  return (
    <div style={{ padding: '4px 0' }}>
      {/* Thông tin ca */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Thông tin ca
        </div>
        <SummaryRow label="Mã ca" value={<b style={{ fontFamily: 'monospace', color: '#4f46e5' }}>{data.shiftCode}</b>} />
        <SummaryRow label="Nhân viên" value={`${data.userFullName} (${data.userEmployeeCode})`} />
        <SummaryRow label="Vai trò" value={data.userRoleName} />
        <SummaryRow label="Quầy" value={data.counterName} />
        <SummaryRow label="Chi nhánh" value={data.branchName} />
        <SummaryRow label="Trạng thái" value={
          data.status === 'Open'
            ? <Tag color="success">Đang mở</Tag>
            : <Tag color="default">Đã đóng</Tag>
        } />
        <SummaryRow label="Mở lúc" value={formatDatetime(data.openedAt)} />
        {data.closedAt && <SummaryRow label="Đóng lúc" value={formatDatetime(data.closedAt)} />}
        {data.note && <SummaryRow label="Ghi chú" value={data.note} />}
      </div>

      {/* Tiền mặt */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Tiền mặt LAK
        </div>
        <SummaryRow label="Tiền mặt đầu ca" value={formatKip(data.openingCashLak)} />
        <SummaryRow label="Ngân hàng đầu ca" value={formatKip(data.openingBankLak)} />
        <SummaryRow
          label="Tiền mặt cuối ca"
          value={data.closingCashLak != null ? formatKip(data.closingCashLak) : <span style={{ color: '#d1d5db' }}>Chưa chốt</span>}
        />
        <SummaryRow
          label="Ngân hàng cuối ca"
          value={data.closingBankLak != null ? formatKip(data.closingBankLak) : <span style={{ color: '#d1d5db' }}>Chưa chốt</span>}
        />
        {data.lakDenominations.length > 0 && (
          <DenomTable entries={data.lakDenominations} currency="₭" hasClosing={data.status === 'Closed'} />
        )}
        <SummaryRow label="Tồn quỹ ước tính" value={<b>{formatKip(s.netCashMovement)}</b>} highlight />
      </div>

      {/* Ngoại tệ */}
      {data.currencyBalances.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Ngoại tệ
          </div>
          {data.currencyBalances.map(b => (
            <div key={b.currency}>
              <SummaryRow
                label={b.currency}
                value={
                  <span>
                    <span>{b.openingAmount.toLocaleString('lo-LA')}</span>
                    {b.closingAmount != null && (
                      <span style={{ color: '#6b7280' }}> → {b.closingAmount.toLocaleString('lo-LA')}</span>
                    )}
                    {' '}{b.currency}
                  </span>
                }
              />
              {b.denominations.length > 0 && (
                <DenomTable entries={b.denominations} currency={b.currency} hasClosing={data.status === 'Closed'} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tổng hợp hoạt động */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Tổng hợp hoạt động
        </div>
        <SummaryRow label="Bán hàng (tiền mặt)" value={formatKip(s.banHangCash)} />
        <SummaryRow label="Bán hàng (chuyển khoản)" value={formatKip(s.banHangBank)} />
        <SummaryRow label="Bán hàng (tổng)" value={<b>{formatKip(s.banHangTotal)}</b>} highlight />
        <SummaryRow label="Mua hàng (tiền mặt)" value={formatKip(s.muaHangCash)} />
        <SummaryRow label="Mua hàng (chuyển khoản)" value={formatKip(s.muaHangBank)} />
        <SummaryRow label="Mua hàng (tổng)" value={<b>{formatKip(s.muaHangTotal)}</b>} highlight />
        <SummaryRow label="Đổi hàng (chênh lệch)" value={formatKip(s.doiHangTotal)} />
        <SummaryRow label="Phiếu thu" value={formatKip(s.phieuThuTotal)} />
        <SummaryRow label="Phiếu chi" value={formatKip(s.phieuChiTotal)} />
      </div>
    </div>
  )
}

// ─── Expanded row giao dịch ───────────────────────────────────────────────────

function TxnExpandedRow({ record }: { record: ShiftTransactionItem }) {
  const isTrade = record.nghiepVu === 'Mua thêm' || record.nghiepVu === 'Đổi hàng' || record.nghiepVu === 'Đổi miễn phí' || record.nghiepVu === 'Đổi thành tiền'
  const isFx = record.nghiepVu === 'Thu đổi ngoại tệ'

  return (
    <div style={{ padding: '10px 24px 14px', background: '#f8faff', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 200 }}>
        <ExpandField label="Chứng từ gốc" value={<span style={{ fontFamily: 'monospace', fontSize: 12 }}>{record.chungTuGoc}</span>} />
        <ExpandField label="Đối tượng" value={record.doiTuong} />
        <ExpandField label="Khách hàng" value={record.khachHang} />
        <ExpandField label="Quầy" value={record.quay || null} />
        {record.soPT_PC && <ExpandField label="Số PT/PC" value={record.soPT_PC} />}
      </div>

      <div style={{ minWidth: 200 }}>
        {/* Hình thức thanh toán chi tiết (COMBINED) */}
        {record.hinhThucTT === 'COMBINED' && (
          <>
            <ExpandField label="Tiền mặt" value={record.cashAmount != null ? formatKip(record.cashAmount) : null} />
            <ExpandField label="Chuyển khoản" value={record.bankAmount != null ? formatKip(record.bankAmount) : null} />
          </>
        )}

        {/* Thu đổi ngoại tệ */}
        {isFx && (
          <>
            <ExpandField label="Tiền khách đưa" value={record.foreignAmount != null && record.sourceCurrency ? `${record.foreignAmount.toLocaleString('lo-LA')} ${record.sourceCurrency}` : null} />
            <ExpandField label="Tiền trả khách" value={record.targetAmount != null && record.targetCurrency ? (record.targetCurrency === 'LAK' ? formatKip(record.targetAmount) : `${record.targetAmount.toLocaleString('lo-LA')} ${record.targetCurrency}`) : null} />
          </>
        )}

        {/* TradeTxn */}
        {isTrade && (
          <>
            <ExpandField label="Sản phẩm cũ" value={record.itemCuName} />
            <ExpandField label="Sản phẩm mới" value={record.itemMoiName} />
            {record.chenhLech != null && (
              <ExpandField
                label="Chênh lệch"
                value={
                  <span style={{ color: record.chenhLech > 0 ? '#15803d' : record.chenhLech < 0 ? '#dc2626' : undefined, fontWeight: 600 }}>
                    {record.chenhLech > 0 ? '+' : ''}{formatKip(record.chenhLech)}
                  </span>
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ExpandField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '3px 0', fontSize: 12 }}>
      <span style={{ minWidth: 130, color: '#6b7280', flexShrink: 0 }}>{label}:</span>
      <span style={{ fontWeight: 500, color: '#111827' }}>
        {value ?? <span style={{ color: '#d1d5db' }}>—</span>}
      </span>
    </div>
  )
}

// ─── Tab: Giao dịch ──────────────────────────────────────────────────────────

function TransactionsTab({ shiftId }: { shiftId: string }) {
  const { data, isLoading } = useShiftTransactions(shiftId, { pageSize: 50 })
  const items = data?.data ?? []

  const columns: TableColumnsType<ShiftTransactionItem> = [
    {
      title: 'Thời gian',
      dataIndex: 'thoiGian',
      key: 'thoiGian',
      width: 130,
      render: (v: string) => <span style={{ fontSize: 12, color: '#374151' }}>{formatDatetime(v)}</span>,
    },
    {
      title: 'Nghiệp vụ',
      dataIndex: 'nghiepVu',
      key: 'nghiepVu',
      width: 150,
      render: (v: string) => (
        <Tag color={NGHIEP_VU_COLOR[v] ?? 'default'} style={{ fontSize: 11 }}>{v}</Tag>
      ),
    },
    {
      title: 'Chứng từ',
      dataIndex: 'chungTuGoc',
      key: 'chungTuGoc',
      width: 170,
      render: (v: string) => (
        <Tooltip title={v}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#4f46e5' }}>
            {v.length > 22 ? v.slice(0, 22) + '…' : v}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Khách hàng',
      key: 'khach',
      render: (_: unknown, r: ShiftTransactionItem) => (
        <span style={{ fontSize: 12 }}>{r.khachHang ?? r.doiTuong ?? <span style={{ color: '#d1d5db' }}>—</span>}</span>
      ),
    },
    {
      title: 'Hình thức TT',
      dataIndex: 'hinhThucTT',
      key: 'hinhThucTT',
      width: 100,
      align: 'center' as const,
      render: (v: string) =>
        v
          ? <Tag color={HINH_THUC_COLOR[v] ?? 'default'} style={{ fontSize: 11 }}>{v}</Tag>
          : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: 'Giá trị',
      dataIndex: 'giaTri',
      key: 'giaTri',
      width: 130,
      align: 'right' as const,
      render: (v: number) => <b style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{formatKip(v)}</b>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      key: 'trangThai',
      width: 90,
      align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'Completed' ? 'success' : 'error'} style={{ fontSize: 11 }}>
          {v === 'Completed' ? 'Hoàn tất' : 'Đã hủy'}
        </Tag>
      ),
    },
  ]

  return (
    <>
      <Table<ShiftTransactionItem>
        rowKey="id"
        dataSource={items}
        columns={columns}
        loading={isLoading}
        size="small"
        bordered
        scroll={{ x: 860 }}
        pagination={items.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
        expandable={{
          expandedRowRender: (r) => <TxnExpandedRow record={r} />,
          rowExpandable: () => true,
        }}
        locale={{ emptyText: 'Chưa có giao dịch trong ca này' }}
      />
      <style>{`.ant-drawer .ant-table-thead > tr > th { white-space: nowrap; }`}</style>
    </>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export function ShiftDetailDrawer({ shiftId, onClose }: Props) {
  return (
    <Drawer
      open={!!shiftId}
      onClose={onClose}
      size="large"
      title={
        <span style={{ fontWeight: 700, fontSize: 15 }}>
          Chi tiết ca bán hàng
        </span>
      }
      destroyOnClose
      styles={{ body: { padding: '16px 20px' } }}
    >
      {shiftId && (
        <Tabs
          defaultActiveKey="summary"
          size="small"
          items={[
            {
              key: 'summary',
              label: 'Tổng quan',
              children: <SummaryTab shiftId={shiftId} />,
            },
            {
              key: 'transactions',
              label: 'Giao dịch trong ca',
              children: <TransactionsTab shiftId={shiftId} />,
            },
          ]}
        />
      )}
    </Drawer>
  )
}
