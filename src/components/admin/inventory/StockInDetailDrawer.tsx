// StockInDetailDrawer — drawer xem chi tiết phiếu nhập kho
'use client'

import { useTranslations } from 'next-intl'
import { Drawer, Descriptions, Tag, Table, Divider, Badge } from 'antd'
import { CalendarOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons'
import type { DescriptionsProps } from 'antd'
import type { ColumnsType } from 'antd/es/table/interface'
import type { InventoryAdjustment } from '@/types/inventory'

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
  background: 'linear-gradient(135deg, #f0f5ff 0%, #e6f4ff 100%)',
  borderBottom: '1px solid #d6e4ff',
  padding: '16px 24px',
}

export function StockInDetailDrawer({ record, onClose }: Props) {
  const t = useTranslations('admin.inventory.stockInList')

  const receiptInfoItems: DescriptionsProps['items'] = record ? [
    {
      key: 'branch', label: t('labelBranch'),
      children: <span style={{ fontWeight: 500 }}>{record.branchName}</span>,
    },
    {
      key: 'counter', label: t('labelCounter'),
      children: record.counterName,
    },
    {
      key: 'createdAt', label: t('labelCreatedAt'),
      children: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarOutlined style={{ color: '#6366f1' }} />
          {formatDate(record.createdAt)}
        </span>
      ),
    },
    {
      key: 'source', label: t('labelSource'),
      children: record.nguonGocLo
        ? <Tag color={record.nguonGocLo === 'Quan' ? 'purple' : 'orange'}>
            {record.nguonGocLo === 'Quan' ? t('sourceQuan') : t('sourceNgoai')}
          </Tag>
        : <span style={{ color: '#9ca3af' }}>—</span>,
    },
    {
      key: 'supplier', label: t('labelSupplier'),
      children: record.supplier
        ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><UserOutlined />{record.supplier}</span>
        : <span style={{ color: '#9ca3af' }}>—</span>,
    },
    {
      key: 'sapCode', label: t('labelSapCode'),
      children: record.documentRef ?? <span style={{ color: '#9ca3af' }}>—</span>,
    },
  ] : []

  const productColumns: ColumnsType<InventoryAdjustment> = [
    { title: '#', width: 40, render: (_v: unknown, _r: InventoryAdjustment, i: number) => i + 1 },
    { title: t('colProductName'), dataIndex: 'productName' },
    { title: t('colQtyDetail'), dataIndex: 'quantity', width: 75, align: 'right' as const },
    {
      title: t('colWeightDetail'), dataIndex: 'weightGram', width: 90, align: 'right' as const,
      render: (v: number) => v?.toFixed(2) ?? '—',
    },
  ]

  const hasExtra = !!(record?.reason || record?.paymentMethod || record?.actualValue)
  const extraItems: DescriptionsProps['items'] = record ? [
    ...(record.reason ? [{ key: 'reason', label: t('labelReason'), children: record.reason }] : []),
    ...(record.paymentMethod ? [{ key: 'pay', label: t('labelPayment'), children: record.paymentMethod === 'CASH' ? t('paymentCash') : t('paymentBank') }] : []),
    ...(record.actualValue ? [{ key: 'value', label: t('labelValue'), children: <b>{record.actualValue.toLocaleString('lo-LA')} ₭</b> }] : []),
  ] : []

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      width={480}
      styles={{ header: DRAWER_HEADER_STYLE, body: { padding: '20px 24px' } }}
      title={
        record ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShopOutlined style={{ color: '#6366f1', fontSize: 18 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1e1b4b' }}>
                {t('detailTitle', { code: record.adjustmentCode })}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {formatDate(record.createdAt)}
              </div>
            </div>
            <Badge status="success" text={<span style={{ fontSize: 12, color: '#16a34a' }}>{t('statusDone')}</span>} style={{ marginLeft: 'auto' }} />
          </div>
        ) : ''
      }
    >
      {record && (
        <>
          {/* Thông tin phiếu */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
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

          {/* Sản phẩm nhập */}
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, background: '#6366f1', borderRadius: 2, display: 'inline-block' }} />
            {t('sectionProducts')}
          </div>
          <Table<InventoryAdjustment>
            rowKey="id"
            columns={productColumns}
            dataSource={[record]}
            pagination={false}
            size="small"
            bordered
            style={{ borderRadius: 6, overflow: 'hidden' }}
          />

          {/* Ghi chú / thanh toán */}
          {hasExtra && (
            <>
              <Divider style={{ margin: '20px 0 14px' }} />
              <Descriptions
                items={extraItems}
                column={1}
                size="small"
                bordered
                labelStyle={{ width: 120, background: '#f9fafb', color: '#6b7280', fontSize: 12 }}
                contentStyle={{ fontSize: 13 }}
              />
            </>
          )}
        </>
      )}
    </Drawer>
  )
}
