// StockOutListPage — Danh mục xuất kho: list phiếu OUT + expandable detail + modal tạo mới
'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Button, Input, Tooltip, Select, Card } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType, TableRowSelection } from 'antd/es/table/interface'
import { useInventoryAdjustments } from '@/hooks/useInventory'
import { useWeightUnits } from '@/hooks/useConfig'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { useAuthStore } from '@/stores/auth.store'
import { StockOutCreateModal } from './StockOutCreateModal'
import type { InventoryAdjustment, InventoryAdjustmentLine } from '@/types/inventory'

const PAGE_SIZE = 20

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '14px 16px',
  borderBottom: '1px solid #f0f0f0', background: '#fafafa',
}
const CODE_STYLE: React.CSSProperties = {
  color: '#ef4444', fontWeight: 600, fontFamily: 'monospace',
  fontSize: 13, letterSpacing: '0.01em',
}
const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151',
  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={SECTION_LABEL_STYLE}>
      <span style={{ width: 3, height: 12, background: '#ef4444', borderRadius: 2, display: 'inline-block' }} />
      {children}
    </div>
  )
}

function ExpandedRow({ record, t }: { record: InventoryAdjustment; t: (k: string) => string }) {
  const { data: units = [] } = useWeightUnits()
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.tenDonVi])), [units])

  const dash = <span style={{ color: '#d1d5db' }}>—</span>

  const productColumns: ColumnsType<InventoryAdjustmentLine> = [
    { title: '#', width: 40, render: (_v: unknown, _r: InventoryAdjustmentLine, i: number) => i + 1 },
    {
      title: t('colProductCode'), dataIndex: 'productCode', width: 120,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v}</span>,
    },
    { title: t('colProductName'), dataIndex: 'productName' },
    {
      title: t('colPurity'), dataIndex: 'purity', width: 100,
      render: (v: string | null) => v ?? dash,
    },
    {
      title: t('colUnit'), dataIndex: 'weightUnitId', width: 90,
      render: (v: string | null) => (v ? unitMap.get(v) : null) ?? dash,
    },
    { title: t('colQtyDetail'), dataIndex: 'quantity', width: 80, align: 'right' as const },
  ]

  return (
    <div style={{ padding: '16px 16px 16px 48px', background: '#fafafa' }}>
      <SectionLabel>{t('sectionProducts')}</SectionLabel>
      <Table<InventoryAdjustmentLine>
        rowKey="id"
        dataSource={record.lines}
        columns={productColumns}
        size="small"
        bordered
        pagination={false}
        style={{ borderRadius: 6, overflow: 'hidden' }}
      />
    </div>
  )
}

export function StockOutListPage() {
  const t = useTranslations('admin.inventory.stockOutList')
  const user = useAuthStore(s => s.user)

  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [branchId, setBranchId] = useState<string | null>(null)
  const [counterId, setCounterId] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)

  const effectiveBranchId = branchId ?? user?.branchId ?? null
  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(effectiveBranchId)

  const [prevBranch, setPrevBranch] = useState(effectiveBranchId)
  if (effectiveBranchId !== prevBranch) { setPrevBranch(effectiveBranchId); setCounterId(null); setPage(1) }

  const { data: paged, isLoading, refetch } = useInventoryAdjustments({
    direction: 'OUT',
    branchId: effectiveBranchId ?? undefined,
    counterId: counterId ?? undefined,
    keyword: keyword.trim() || undefined,
    page,
    pageSize: PAGE_SIZE,
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
      title: t('colCode'), dataIndex: 'adjustmentCode', width: 150,
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
      title: t('colTotalQty'), dataIndex: 'totalQuantity', width: 90, align: 'center' as const,
      render: (v: number) => <b style={{ fontSize: 14, color: '#ef4444' }}>{v}</b>,
    },
    {
      title: t('colNote'), dataIndex: 'reason', ellipsis: true,
      render: (v: string) => v
        ? <Tooltip title={v}><span style={{ color: '#6b7280', fontSize: 13 }}>{v}</span></Tooltip>
        : <span style={{ color: '#d1d5db' }}>—</span>,
    },
  ], [t, page])

  const rowSelection: TableRowSelection<InventoryAdjustment> = {
    type: 'checkbox',
    selectedRowKeys,
    onChange: keys => setSelectedRowKeys(keys as string[]),
  }

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{t('title')}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: paged?.total ?? 0 })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder={t('searchPlaceholder')}
            allowClear
            style={{ width: 230 }}
            onSearch={v => { setKeyword(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setKeyword(''); setPage(1) } }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => console.log('delete:', selectedRowKeys)}
          >
            {t('deleteBtn')}
          </Button>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            {t('addNew')}
          </Button>
        </div>
      </div>

      {/* ── Card bảng ──────────────────────────────────────────── */}
      <Card
        style={{
          borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
        }}
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
      >
        <div style={FILTER_STYLE}>
          <Select
            allowClear
            placeholder={t('filterBranch')}
            style={{ width: 180 }}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            value={effectiveBranchId}
            onChange={v => setBranchId(v ?? null)}
          />
          <Select
            allowClear
            placeholder={t('filterCounter')}
            style={{ width: 160 }}
            options={counters.map(c => ({ value: c.id, label: c.counterName }))}
            value={counterId}
            onChange={v => setCounterId(v ?? null)}
          />
        </div>

        <Table<InventoryAdjustment>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={isLoading}
          rowSelection={rowSelection}
          bordered
          size="middle"
          scroll={{ x: 1100 }}
          expandable={{
            expandedRowKeys: expandedKeys,
            expandRowByClick: true,
            showExpandColumn: false,
            onExpand: (expanded, record) =>
              setExpandedKeys(expanded
                ? [...expandedKeys, record.id]
                : expandedKeys.filter(k => k !== record.id)
              ),
            expandedRowRender: record => <ExpandedRow record={record} t={k => t(k as Parameters<typeof t>[0])} />,
          }}
          rowClassName={(_, i) => i % 2 !== 0 ? 'stock-out-row-alt' : ''}
          pagination={{
            total: paged?.total,
            current: page,
            pageSize: PAGE_SIZE,
            onChange: p => setPage(p),
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, [from, to]) => `${from}–${to} / ${total} bản ghi`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.stock-out-row-alt > td { background: #fafafa !important; }`}</style>

      <StockOutCreateModal
        open={createOpen}
        branchId={effectiveBranchId}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => { refetch(); setCreateOpen(false) }}
      />
    </div>
  )
}
