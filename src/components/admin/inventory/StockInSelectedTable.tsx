// StockInSelectedTable — bảng sản phẩm đã chọn trong phiếu nhập kho
'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Table, InputNumber, Button, Empty } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { useWeightUnits } from '@/hooks/useConfig'
import type { InventoryItem } from '@/types/inventory'

export interface SelectedLine {
  item: InventoryItem
  qty: number
}

interface Props {
  lines: SelectedLine[]
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
}

export function StockInSelectedTable({ lines, onQtyChange, onRemove }: Props) {
  const t = useTranslations('admin.inventory.stockInForm')

  const { data: weightUnits = [] } = useWeightUnits()
  const unitMap = useMemo(
    () => new Map(weightUnits.map(u => [u.id, u.tenDonVi])),
    [weightUnits],
  )

  const columns: TableColumnsType<SelectedLine> = [
    {
      // expand placeholder
      width: 32,
      render: () => null,
    },
    {
      title: '#',
      width: 50,
      render: (_, __, i) => i + 1,
    },
    {
      title: t('colCode'),
      width: 100,
      render: (_, r) => (
        <span style={{ color: '#1677ff', fontFamily: 'monospace', fontSize: 12 }}>
          {r.item.productCode}
        </span>
      ),
    },
    {
      title: t('colName'),
      render: (_, r) => r.item.productName,
    },
    {
      title: t('colUnit'),
      width: 90,
      render: (_, r) => (r.item.weightUnitId ? unitMap.get(r.item.weightUnitId) : null) ?? '—',
    },
    {
      title: t('colQty'),
      width: 120,
      render: (_, r) => (
        <InputNumber
          min={0}
          value={r.qty}
          onChange={v => onQtyChange(r.item.id, v ?? 0)}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: t('colDelete'),
      width: 60,
      align: 'center',
      render: (_, r) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => onRemove(r.item.id)}
        />
      ),
    },
  ]

  if (lines.length === 0) {
    return <Empty description={t('emptyProd')} style={{ margin: '24px 0' }} />
  }

  return (
    <Table<SelectedLine>
      rowKey={r => r.item.id}
      columns={columns}
      dataSource={lines}
      size="small"
      pagination={false}
      expandable={{ expandedRowRender: () => <></>, rowExpandable: () => false }}
      scroll={{ y: 260 }}
    />
  )
}
