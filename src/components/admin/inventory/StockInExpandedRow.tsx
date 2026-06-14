'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Table } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import { useWeightUnits } from '@/hooks/useConfig'
import type { InventoryAdjustment, InventoryAdjustmentLine } from '@/types/inventory'

interface Props { record: InventoryAdjustment }

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151',
  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
}

const DASH = <span style={{ color: '#d1d5db' }}>—</span>

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={SECTION_LABEL_STYLE}>
      <span style={{ width: 3, height: 12, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
      {children}
    </div>
  )
}

export function StockInExpandedRow({ record }: Props) {
  const t = useTranslations('admin.inventory.stockInList')
  const { data: units = [] } = useWeightUnits()
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.tenDonVi])), [units])

  const productColumns: ColumnsType<InventoryAdjustmentLine> = [
    { title: '#', width: 40, render: (_v: unknown, _r: InventoryAdjustmentLine, i: number) => i + 1 },
    {
      title: t('colProductCode'), dataIndex: 'productCode', width: 120,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{v}</span>,
    },
    { title: t('colProductName'), dataIndex: 'productName' },
    {
      title: t('colPurity'), dataIndex: 'purity', width: 100,
      render: (v: string | null) => v ?? DASH,
    },
    {
      title: t('colUnit'), dataIndex: 'weightUnitId', width: 90,
      render: (v: string | null) => (v ? unitMap.get(v) : null) ?? DASH,
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
