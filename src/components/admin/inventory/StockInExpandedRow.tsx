'use client'

import { useTranslations } from 'next-intl'
import { Descriptions, Table, Tag } from 'antd'
import type { DescriptionsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import type { InventoryAdjustment, InventoryAdjustmentLine } from '@/types/inventory'

interface Props { record: InventoryAdjustment }

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#374151',
  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={SECTION_LABEL_STYLE}>
      <span style={{ width: 3, height: 12, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
      {children}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function StockInExpandedRow({ record }: Props) {
  const t = useTranslations('admin.inventory.stockInList')

  const sourceNode = record.nguonGoc
    ? <Tag color={record.nguonGoc === 'Quan' ? 'purple' : 'orange'} style={{ borderRadius: 10, fontSize: 11 }}>
        {record.nguonGoc === 'Quan' ? t('sourceQuan') : t('sourceNgoai')}
      </Tag>
    : <span style={{ color: '#9ca3af' }}>—</span>

  const paymentNode = record.paymentMethod === 'CASH'
    ? t('paymentCash')
    : record.paymentMethod === 'BANK'
      ? t('paymentBank')
      : <span style={{ color: '#9ca3af' }}>—</span>

  const infoItems: DescriptionsProps['items'] = [
    { key: 'branch',    label: t('labelBranch'),    children: <span style={{ fontWeight: 500 }}>{record.branchName}</span> },
    { key: 'counter',   label: t('labelCounter'),   children: record.counterName },
    { key: 'createdAt', label: t('labelCreatedAt'), children: formatDate(record.createdAt) },
    { key: 'source',    label: t('labelSource'),    children: sourceNode },
    { key: 'supplier',  label: t('labelSupplier'),  children: record.supplier ?? <span style={{ color: '#9ca3af' }}>—</span> },
    ...(record.reason ? [{ key: 'reason',  label: t('labelReason'),  children: record.reason }] : []),
    { key: 'payment', label: t('labelPayment'), children: paymentNode },
    ...(record.totalValue ? [{ key: 'value', label: t('labelValue'), children: <b style={{ color: '#16a34a' }}>{record.totalValue.toLocaleString('lo-LA')} ₭</b> }] : []),
  ]

  const productColumns: ColumnsType<InventoryAdjustmentLine> = [
    { title: '#', width: 40, render: (_v: unknown, _r: InventoryAdjustmentLine, i: number) => i + 1 },
    { title: t('colProductName'), dataIndex: 'productName' },
    { title: t('colQtyDetail'),   dataIndex: 'quantity',   width: 80,  align: 'right' as const },
  ]

  return (
    <div style={{ padding: '16px 16px 16px 48px', background: '#fafafa', display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      {/* Thông tin phiếu */}
      <div style={{ minWidth: 320 }}>
        <SectionLabel>{t('sectionInfo')}</SectionLabel>
        <Descriptions
          items={infoItems}
          column={1}
          size="small"
          bordered
          labelStyle={{ width: 110, fontSize: 12, color: '#6b7280', background: '#f9fafb' }}
          contentStyle={{ fontSize: 13 }}
        />
      </div>

      {/* Sản phẩm nhập */}
      <div style={{ flex: 1, minWidth: 280 }}>
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
    </div>
  )
}
