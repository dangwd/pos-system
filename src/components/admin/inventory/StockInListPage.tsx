// StockInListPage — Danh mục nhập kho
'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Button, Input, Tag, Tooltip, Select, Card } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface'
import { useInventoryAdjustments } from '@/hooks/useInventory'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useAuthStore } from '@/stores/auth.store'
import { StockInCreateModal } from './StockInCreateModal'
import { StockInExpandedRow } from './StockInExpandedRow'
import type { InventoryAdjustment } from '@/types/inventory'

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PAGE_STYLE: React.CSSProperties  = { padding: '24px 24px 32px' }
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '14px 16px',
  borderBottom: '1px solid #f0f0f0', background: '#fafafa',
}
const CODE_STYLE: React.CSSProperties = {
  color: '#111827', fontWeight: 600, fontFamily: 'monospace',
  fontSize: 13, letterSpacing: '0.01em',
}

export function StockInListPage() {
  const t = useTranslations('admin.inventory.stockInList')
  const user = useAuthStore(s => s.user)

  const [page, setPage]                   = useState(1)
  const [keyword, setKeyword]             = useState('')
  const [branchId, setBranchId]           = useState<string | null>(null)
  const [counterId, setCounterId]         = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [expandedKeys, setExpandedKeys]   = useState<string[]>([])
  const [createOpen, setCreateOpen]       = useState(false)

  const effectiveBranchId = branchId ?? user?.branchId ?? null
  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(effectiveBranchId)

  const [prevBranch, setPrevBranch] = useState(effectiveBranchId)
  if (effectiveBranchId !== prevBranch) { setPrevBranch(effectiveBranchId); setCounterId(null); setPage(1) }

  const { data: paged, isLoading, refetch } = useInventoryAdjustments({
    direction: 'IN',
    branchId: effectiveBranchId ?? undefined,
    counterId: counterId ?? undefined,
    keyword: keyword.trim() || undefined,
    page, pageSize: PAGE_SIZE,
  })
  const rows = paged?.data ?? []

  const columns = useMemo((): ColumnsType<InventoryAdjustment> => [
    {
      title: t('colStt'), width: 55, align: 'center' as const,
      render: (_v: unknown, _r: InventoryAdjustment, i: number) => (
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{(page - 1) * PAGE_SIZE + i + 1}</span>
      ),
    },
    {
      title: t('colCode'), dataIndex: 'adjustmentCode', width: 140,
      sorter: (a: InventoryAdjustment, b: InventoryAdjustment) => a.adjustmentCode.localeCompare(b.adjustmentCode),
      render: (v: string) => <span style={CODE_STYLE}>{v}</span>,
    },
    { title: t('colBranch'), dataIndex: 'branchName' },
    { title: t('colCounter'), dataIndex: 'counterName' },
    {
      title: t('colCreatedAt'), dataIndex: 'createdAt', width: 148,
      render: (v: string) => <span style={{ fontSize: 13 }}>{formatDate(v)}</span>,
      sorter: (a: InventoryAdjustment, b: InventoryAdjustment) => a.createdAt.localeCompare(b.createdAt),
    },
    {
      title: t('colTotalQty'), dataIndex: 'totalQuantity', width: 85, align: 'center' as const,
      render: (v: number) => <b style={{ fontSize: 14 }}>{v}</b>,
    },
    {
      title: t('colSupplier'), dataIndex: 'supplier',
      render: (v: string | null) => v ?? <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: t('colNote'), dataIndex: 'reason', ellipsis: true,
      render: (v: string) => v
        ? <Tooltip title={v}><span style={{ color: '#6b7280', fontSize: 13 }}>{v}</span></Tooltip>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
    {
      title: t('colSource'), dataIndex: 'nguonGoc', width: 110,
      render: (v: string | null) => v
        ? <Tag color={v === 'Quan' ? 'purple' : 'orange'} style={{ borderRadius: 12, fontSize: 11 }}>
            {v === 'Quan' ? t('sourceQuan') : t('sourceNgoai')}
          </Tag>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
  ], [t, page])

  const rowSelection: TableRowSelection<InventoryAdjustment> = {
    type: 'checkbox', selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys as string[]),
  }

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{t('title')}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: paged?.total ?? 0 })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder={t('searchPlaceholder')} allowClear style={{ width: 230 }}
            onSearch={v => { setKeyword(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setKeyword(''); setPage(1) } }}
          />
          <Button danger icon={<DeleteOutlined />} disabled={selectedRowKeys.length === 0}
            onClick={() => console.log('delete:', selectedRowKeys)}>
            {t('deleteBtn')}
          </Button>
          <Button type="primary" onClick={() => setCreateOpen(true)}>{t('addNew')}</Button>
        </div>
      </div>

      {/* ── Bảng ── */}
      <Card
        style={{ borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #e5e7eb' }}
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
      >
        <div style={FILTER_STYLE}>
          <Select allowClear placeholder={t('filterBranch')} style={{ width: 180 }}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={effectiveBranchId} onChange={v => setBranchId(v ?? null)} />
          <Select allowClear placeholder={t('filterCounter')} style={{ width: 160 }}
            options={counters.map(c => ({ value: c.id, label: c.counterName }))}
            value={counterId} onChange={v => setCounterId(v ?? null)} />
        </div>

        <Table<InventoryAdjustment>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          rowSelection={rowSelection}
          bordered
          size="middle"
          scroll={{ x: 1000 }}
          rowClassName={(record, i) => [
            i % 2 !== 0 ? 'stock-in-row-alt' : '',
            expandedKeys.includes(record.id) ? 'stock-in-row-expanded' : '',
          ].filter(Boolean).join(' ')}
          expandable={{
            expandedRowKeys: expandedKeys,
            expandRowByClick: true,
            showExpandColumn: false,
            onExpand: (expanded, record) =>
              setExpandedKeys(expanded ? [record.id] : []),
            expandedRowRender: record => <StockInExpandedRow record={record} />,
          }}
          pagination={{
            total: paged?.total, current: page, pageSize: PAGE_SIZE,
            onChange: p => setPage(p),
            showSizeChanger: true, pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, [from, to]) => `${from}–${to} / ${total} bản ghi`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`
        .stock-in-row-alt > td { background: #fafafa !important; }
        .stock-in-row-expanded > td { background: #eff6ff !important; }
      `}</style>

      <StockInCreateModal
        open={createOpen}
        branchId={effectiveBranchId}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { refetch(); setCreateOpen(false) }}
      />
    </div>
  )
}
