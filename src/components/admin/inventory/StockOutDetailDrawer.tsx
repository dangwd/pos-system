// StockOutDetailDrawer — drawer xem chi tiết phiếu xuất kho
'use client'

import { useTranslations } from 'next-intl'
import { Drawer, Descriptions, Table, Divider, Badge } from 'antd'
import { CalendarOutlined, ExportOutlined } from '@ant-design/icons'
import type { DescriptionsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import type { InventoryAdjustment, InventoryAdjustmentLine } from '@/types/inventory'

interface Props {
  record: InventoryAdjustment | null
  onClose: () => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const DRAWER_HEADER_STYLE: React.CSSProperties = {
  background: 'linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%)',
  borderBottom: '1px solid #fecaca',
  padding: '16px 24px',
}

export function StockOutDetailDrawer({ record, onClose }: Props) {
  const t = useTranslations('admin.inventory.stockOutList')

  const receiptInfoItems: DescriptionsProps['items'] = record ? [
    {
      key: 'branch',
      label: t('labelBranch'),
      children: <span style={{ fontWeight: 500 }}>{record.branchName}</span>,
    },
    {
      key: 'counter',
      label: t('labelCounter'),
      children: record.counterName,
    },
    {
      key: 'createdAt',
      label: t('labelCreatedAt'),
      children: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarOutlined style={{ color: '#ef4444' }} />
          {formatDate(record.createdAt)}
        </span>
      ),
    },
    ...(record.reason
      ? [{
          key: 'reason',
          label: t('labelReason'),
          children: record.reason,
        }]
      : []),
  ] : []

  const productColumns: ColumnsType<InventoryAdjustmentLine> = [
    { title: '#', width: 40, render: (_v: unknown, _r: InventoryAdjustmentLine, i: number) => i + 1 },
    { title: t('colProductName'), dataIndex: 'productName' },
    { title: t('colQtyDetail'), dataIndex: 'quantity', width: 75, align: 'right' as const },
  ]

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      width={480}
      styles={{ header: DRAWER_HEADER_STYLE, body: { padding: '20px 24px' } }}
      title={
        record ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExportOutlined style={{ color: '#ef4444', fontSize: 18 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#7f1d1d' }}>
                {t('detailTitle', { code: record.adjustmentCode })}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {formatDate(record.createdAt)}
              </div>
            </div>
            <Badge
              status="success"
              text={<span style={{ fontSize: 12, color: '#16a34a' }}>{t('statusDone')}</span>}
              style={{ marginLeft: 'auto' }}
            />
          </div>
        ) : ''
      }
    >
      {record && (
        <>
          <div style={{
            fontSize: 13, fontWeight: 600, color: '#374151',
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 3, height: 14, background: '#ef4444', borderRadius: 2, display: 'inline-block' }} />
            {t('sectionInfo')}
          </div>
          <Descriptions
            items={receiptInfoItems}
            column={1}
            size="small"
            bordered
            labelStyle={{ width: 120, background: '#f9fafb', color: '#6b7280', fontSize: 12 }}
            contentStyle={{ fontSize: 13 }}
          />

          <Divider style={{ margin: '20px 0 14px' }} />

          <div style={{
            fontSize: 13, fontWeight: 600, color: '#374151',
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 3, height: 14, background: '#ef4444', borderRadius: 2, display: 'inline-block' }} />
            {t('sectionProducts')}
          </div>
          <Table<InventoryAdjustmentLine>
            rowKey="id"
            columns={productColumns}
            dataSource={record.lines}
            pagination={false}
            size="small"
            bordered
            style={{ borderRadius: 6, overflow: 'hidden' }}
          />
        </>
      )}
    </Drawer>
  )
}
