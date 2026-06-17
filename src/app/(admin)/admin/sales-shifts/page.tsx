'use client'

import { useMemo, useState } from 'react'
import { Card, Table, Input, Select, DatePicker, Tag } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { createSalesShiftColumns } from '@/components/admin/columns/sales-shift-columns'
import { ShiftDetailDrawer } from '@/components/admin/sales-shifts/ShiftDetailDrawer'
import { useSalesShiftList } from '@/hooks/useSalesShift'
import type { SalesShiftListItem, SalesShiftListParams } from '@/types/sales-shift'

const PAGE_SIZE = 20

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap' as const,
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
}

export default function SalesShiftsPage() {
  const [keyword,    setKeyword]    = useState('')
  const [status,     setStatus]     = useState<'Open' | 'Closed' | undefined>(undefined)
  const [from,       setFrom]       = useState<string | undefined>(undefined)
  const [to,         setTo]         = useState<string | undefined>(undefined)
  const [page,       setPage]       = useState(1)
  const [detailId,   setDetailId]   = useState<string | null>(null)

  const params: SalesShiftListParams = {
    q: keyword || undefined,
    status,
    from,
    to,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading } = useSalesShiftList(params)
  const items = data?.data ?? []
  const total = data?.total ?? 0

  const columns = useMemo(
    () => createSalesShiftColumns(
      {
        colShiftCode:   'Mã ca',
        colEmployee:    'Nhân viên',
        colCounter:     'Quầy / Chi nhánh',
        colStatus:      'Trạng thái',
        colOpeningCash: 'Tiền đầu ca',
        colOpenedAt:    'Mở lúc',
        colClosedAt:    'Đóng lúc',
        colActions:     'Thao tác',
        statusOpen:     'Đang mở',
        statusClosed:   'Đã đóng',
        actionView:     'Xem chi tiết',
      },
      (record: SalesShiftListItem) => setDetailId(record.id),
    ),
    [],
  )

  const handleSearch = (value: string) => { setKeyword(value); setPage(1) }
  const handleStatusChange = (v: string) => {
    setStatus(v === 'all' ? undefined : v as 'Open' | 'Closed')
    setPage(1)
  }

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề ── */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Ca Bán Hàng
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
          Quản lý ca làm việc của nhân viên tại quầy
        </p>
      </div>

      {/* ── Card ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        {/* Filters */}
        <div style={FILTER_STYLE}>
          <Input.Search
            placeholder="Tìm mã ca, tên nhân viên..."
            allowClear
            style={{ width: 240 }}
            onSearch={handleSearch}
            onChange={e => { if (!e.target.value) handleSearch('') }}
          />
          <Select
            defaultValue="all"
            style={{ width: 130 }}
            onChange={handleStatusChange}
            options={[
              { value: 'all',    label: 'Tất cả' },
              { value: 'Open',   label: <Tag color="success">Đang mở</Tag> },
              { value: 'Closed', label: <Tag color="default">Đã đóng</Tag> },
            ]}
          />
          <DatePicker
            placeholder="Từ ngày"
            style={{ width: 140 }}
            suffixIcon={<CalendarOutlined />}
            onChange={d => { setFrom(d ? dayjs(d).toISOString() : undefined); setPage(1) }}
          />
          <DatePicker
            placeholder="Đến ngày"
            style={{ width: 140 }}
            suffixIcon={<CalendarOutlined />}
            onChange={d => { setTo(d ? dayjs(d).endOf('day').toISOString() : undefined); setPage(1) }}
          />
        </div>

        {/* Table */}
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={isLoading}
          bordered
          size="middle"
          scroll={{ x: 900 }}
          rowClassName={(_, i) => i % 2 !== 0 ? 'shifts-row-alt' : ''}
          pagination={{
            current:  page,
            pageSize: PAGE_SIZE,
            total,
            onChange: p => setPage(p),
            showSizeChanger: false,
            showTotal: (t, [f, l]) => `${f}–${l} / ${t} ca`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.shifts-row-alt > td { background: #fafafa !important; }`}</style>

      <ShiftDetailDrawer shiftId={detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}
