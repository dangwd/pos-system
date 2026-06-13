// StockOutSelectedTable — bảng sản phẩm đã chọn trong phiếu xuất kho
'use client'

import { useTranslations } from 'next-intl'
import { Table, InputNumber, Button, Empty, Tooltip } from 'antd'
import { DeleteOutlined, WarningOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import type { InventoryItem } from '@/types/inventory'

export interface SelectedOutLine {
  item: InventoryItem
  qty: number
}

interface Props {
  lines: SelectedOutLine[]
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
}

export function StockOutSelectedTable({ lines, onQtyChange, onRemove }: Props) {
  const t = useTranslations('admin.inventory.stockOutForm')

  const columns: TableColumnsType<SelectedOutLine> = [
    { width: 32, render: () => null },
    { title: '#', width: 50, render: (_, __, i) => i + 1 },
    {
      title: t('colCode'),
      width: 100,
      render: (_, r) => (
        <span style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 12 }}>
          {r.item.productCode}
        </span>
      ),
    },
    {
      title: t('colName'),
      render: (_, r) => r.item.productName,
    },
    {
      title: t('colStock'),
      width: 90,
      align: 'center' as const,
      render: (_, r) => (
        <span style={{ fontSize: 12, color: '#6b7280' }}>{r.item.quantity}</span>
      ),
    },
    {
      title: t('colQty'),
      width: 140,
      render: (_, r) => {
        const overStock = r.qty > r.item.quantity
        return (
          <Tooltip title={overStock ? `Max: ${r.item.quantity}` : undefined}>
            <InputNumber
              min={0}
              max={r.item.quantity}
              value={r.qty}
              onChange={v => onQtyChange(r.item.id, v ?? 0)}
              size="small"
              style={{ width: '100%' }}
              status={overStock ? 'error' : undefined}
              addonAfter={overStock ? <WarningOutlined style={{ color: '#ef4444', fontSize: 11 }} /> : undefined}
            />
          </Tooltip>
        )
      },
    },
    {
      title: t('colDelete'),
      width: 60,
      align: 'center' as const,
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
    <Table<SelectedOutLine>
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
