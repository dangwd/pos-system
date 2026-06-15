'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Button, Input, Card } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createCustomerColumns } from '@/components/admin/columns/customer-columns'
import { CustomerCreateDialog } from '@/components/admin/customers/CustomerCreateDialog'
import { CustomerEditDialog } from '@/components/admin/customers/CustomerEditDialog'
import { useCustomerList } from '@/hooks/useCustomers'
import type { CustomerDetail } from '@/types/customer'

const PAGE_SIZE = 20

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}

export default function CustomersPage() {
  const t       = useTranslations('admin.customers')
  const tStatus = useTranslations('admin.users')

  const [createOpen,    setCreateOpen]    = useState(false)
  const [editCustomer,  setEditCustomer]  = useState<CustomerDetail | null>(null)
  const [keyword,       setKeyword]       = useState('')
  const [page,          setPage]          = useState(1)

  const { data: customers = [], isLoading } = useCustomerList(
    keyword ? { q: keyword } : undefined,
  )

  const columns = useMemo(
    () => createCustomerColumns(
      {
        name:     t('columns.name'),
        phone:    t('columns.phone'),
        email:    t('columns.email'),
        loyalty:  t('columns.loyalty'),
        points:   t('columns.points'),
        status:   t('columns.status'),
        actions:  t('columns.actions'),
        edit:     t('columns.edit'),
        active:   tStatus('status.active'),
        inactive: tStatus('status.inactive'),
      },
      (customer) => setEditCustomer(customer as CustomerDetail),
    ),
    [t, tStatus],
  )

  // Reset page on search
  const handleSearch = (value: string) => { setKeyword(value); setPage(1) }

  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: customers.length })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input.Search
            placeholder={t('searchPlaceholder')}
            allowClear
            style={{ width: 240 }}
            onSearch={handleSearch}
            onChange={e => { if (!e.target.value) handleSearch('') }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            {t('addButton')}
          </Button>
        </div>
      </div>

      {/* ── Bảng ── */}
      <Card style={CARD_STYLE} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={customers}
          loading={isLoading}
          bordered
          size="middle"
          scroll={{ x: 800 }}
          rowClassName={(_, i) => i % 2 !== 0 ? 'customers-row-alt' : ''}
          pagination={{
            current:  page,
            pageSize: PAGE_SIZE,
            total:    customers.length,
            onChange: p => setPage(p),
            showSizeChanger:  true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, [from, to]) => `${from}–${to} / ${total} bản ghi`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.customers-row-alt > td { background: #fafafa !important; }`}</style>

      <CustomerCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <CustomerEditDialog   customer={editCustomer} onClose={() => setEditCustomer(null)} />
    </div>
  )
}
