import { Badge } from '@/components/ui/badge'
import type { SalesShiftListItem } from '@/types/sales-shift'
import { EyeOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import type { TableColumnsType } from 'antd'

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

interface Labels {
  colShiftCode: string
  colEmployee: string
  colCounter: string
  colStatus: string
  colOpeningCash: string
  colOpenedAt: string
  colClosedAt: string
  colActions: string
  statusOpen: string
  statusClosed: string
  actionView: string
}

export function createSalesShiftColumns(
  labels: Labels,
  onView: (record: SalesShiftListItem) => void,
): TableColumnsType<SalesShiftListItem> {
  return [
    {
      title: labels.colShiftCode,
      dataIndex: 'shiftCode',
      key: 'shiftCode',
      width: 110,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5', fontSize: 13 }}>
          {v}
        </span>
      ),
    },
    {
      title: labels.colEmployee,
      key: 'employee',
      render: (_: unknown, r: SalesShiftListItem) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.userFullName}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{r.userEmployeeCode} · {r.userRoleName}</div>
        </div>
      ),
    },
    {
      title: labels.colCounter,
      key: 'counter',
      render: (_: unknown, r: SalesShiftListItem) => (
        <div>
          <div style={{ fontSize: 13 }}>{r.counterName}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{r.branchName}</div>
        </div>
      ),
    },
    {
      title: labels.colStatus,
      dataIndex: 'status',
      key: 'status',
      width: 90,
      align: 'center' as const,
      render: (v: string) =>
        v === 'Open'
          ? <Badge style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>{labels.statusOpen}</Badge>
          : <Badge style={{ backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' }}>{labels.statusClosed}</Badge>,
    },
    {
      title: labels.colOpeningCash,
      dataIndex: 'openingCashLak',
      key: 'openingCashLak',
      width: 140,
      align: 'right' as const,
      render: (v: number) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatKip(v)}</span>,
    },
    {
      title: labels.colOpenedAt,
      dataIndex: 'openedAt',
      key: 'openedAt',
      width: 140,
      render: (v: string) => <span style={{ fontSize: 12, color: '#374151' }}>{formatDatetime(v)}</span>,
    },
    {
      title: labels.colClosedAt,
      dataIndex: 'closedAt',
      key: 'closedAt',
      width: 140,
      render: (v: string | null) =>
        v
          ? <span style={{ fontSize: 12, color: '#374151' }}>{formatDatetime(v)}</span>
          : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: labels.colActions,
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, r: SalesShiftListItem) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => onView(r)}
          title={labels.actionView}
        />
      ),
    },
  ]
}
