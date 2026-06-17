'use client'

import { usePermission } from '@/hooks/usePermission'
import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Table, Button, Input, Select, Card } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { createProductColumns } from '@/components/admin/columns/product-columns'
import { ProductCreateDialog } from '@/components/admin/products/ProductCreateDialog'
import { ProductEditDialog } from '@/components/admin/products/ProductEditDialog'
import { ProductExpandedRow } from '@/components/admin/products/ProductExpandedRow'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useActivateProduct,
  useCategories,
  useDeactivateProduct,
  useProductsPaged,
} from '@/hooks/useProducts'
import { useWeightUnits } from '@/hooks/useConfig'
import type { Product } from '@/types/product'

const PAGE_SIZE = 20
const VISIBLE_ROWS = 13        // số dòng hiển thị tối đa, còn lại cuộn
const ROW_HEIGHT = 48          // chiều cao 1 dòng (size middle) — xấp xỉ
const TABLE_BODY_HEIGHT = VISIBLE_ROWS * ROW_HEIGHT

const PAGE_STYLE: React.CSSProperties = { padding: '24px 24px 32px' }
const CARD_STYLE: React.CSSProperties = {
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07), 0 4px 12px rgba(0,0,0,0.04)',
  border: '1px solid #e5e7eb',
}
const FILTER_STYLE: React.CSSProperties = {
  display: 'flex', gap: 8, padding: '14px 16px',
  borderBottom: '1px solid #f0f0f0', background: '#fafafa',
  flexWrap: 'wrap',
}

export default function ProductsPage() {
  const { hasPermission } = usePermission()
  const t = useTranslations('admin.products')

  const [createOpen,    setCreateOpen]    = useState(false)
  const [editProduct,   setEditProduct]   = useState<Product | null>(null)
  const [expandedKeys,  setExpandedKeys]  = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<{
    type: 'deactivate' | 'activate'
    product: Product
  } | null>(null)

  const [page,           setPage]           = useState(1)
  const [keyword,        setKeyword]        = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const { data: categories  = [] } = useCategories()
  const { data: weightUnits = [] } = useWeightUnits()
  const unitMap = useMemo(
    () => new Map(weightUnits.map(u => [u.id, u.tenDonVi])),
    [weightUnits],
  )

  const { data, isLoading } = useProductsPaged({
    search:       keyword || undefined,
    categoryCode: filterCategory ?? undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const products = data?.data ?? []

  const { mutate: deactivate, isPending: deactivating } = useDeactivateProduct()
  const { mutate: activate,   isPending: activating   } = useActivateProduct()

  const handleConfirmAction = () => {
    if (!pendingAction) return
    const opts = { onSuccess: () => setPendingAction(null) }
    if (pendingAction.type === 'deactivate') deactivate(pendingAction.product.id, opts)
    else                                     activate(pendingAction.product.id, opts)
  }

  const columns = useMemo(
    () => [
      {
        key: 'index',
        title: '#',
        width: 56,
        align: 'center' as const,
        fixed: 'left' as const,
        render: (_: unknown, __: Product, i: number) => (
          <span className="text-xs text-muted-foreground">
            {(page - 1) * PAGE_SIZE + i + 1}
          </span>
        ),
      },
      ...createProductColumns(
        {
          product:     t('columns.product'),
          productCode: t('columns.productCode'),
          category:    t('columns.category'),
          purity:      t('columns.purity'),
          unit:        t('columns.unit'),
          status:      t('columns.status'),
          active:      t('columns.active'),
          inactive:    t('columns.inactive'),
          openMenu:    t('columns.openMenu'),
          edit:        t('columns.edit'),
          deactivate:  t('columns.deactivate'),
          activate:    t('columns.activate'),
          actions:     t('columns.actions'),
        },
        unitMap,
        (product) => setEditProduct(product),
        (product) => setPendingAction({ type: 'deactivate', product }),
        (product) => setPendingAction({ type: 'activate',   product }),
      ),
    ],
    [t, unitMap, page],
  )

  const handleSearch = (value: string) => { setKeyword(value); setPage(1) }


  if (!hasPermission('PRODUCT_MANAGE')) return <ForbiddenPage />
  return (
    <div style={PAGE_STYLE}>
      {/* ── Tiêu đề + actions ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {t('title')}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>
            {t('subtitle', { count: data?.total ?? 0 })}
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
      <Card style={CARD_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <div style={FILTER_STYLE}>
          <Select
            allowClear
            placeholder={t('filterAll')}
            style={{ width: 200 }}
            options={categories.map(c => ({ value: c.code, label: c.name }))}
            value={filterCategory || undefined}
            popupMatchSelectWidth={false}
            onChange={v => { setFilterCategory(v ?? null); setPage(1) }}
          />
        </div>

        <Table<Product>
          rowKey="id"
          columns={columns}
          dataSource={products}
          loading={isLoading}
          bordered
          size="middle"
          scroll={{ x: 900, y: TABLE_BODY_HEIGHT }}
          rowClassName={(r, i) => `products-row-clickable${i % 2 !== 0 ? ' products-row-alt' : ''}${expandedKeys.includes(r.id) ? ' products-row-expanded' : ''}`}
          expandable={{
            expandedRowKeys: expandedKeys,
            expandRowByClick: true,
            showExpandColumn: false,
            onExpand: (expanded, record) => setExpandedKeys(expanded ? [record.id] : []),
            expandedRowRender: (record) => <ProductExpandedRow product={record} />,
          }}
          pagination={{
            current:  page,
            pageSize: PAGE_SIZE,
            total:    data?.total ?? 0,
            onChange: p => setPage(p),
            showSizeChanger:  true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total, [from, to]) => `${from}–${to} / ${total} bản ghi`,
            style: { padding: '12px 16px', borderTop: '1px solid #f0f0f0' },
          }}
        />
      </Card>

      <style>{`.products-row-alt > td { background: #fafafa !important; } .products-row-clickable { cursor: pointer; } .products-row-expanded > td { background: #eef2ff !important; }`}</style>

      <ProductCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <ProductEditDialog   product={editProduct} onClose={() => setEditProduct(null)} />

      <ConfirmDialog
        open={!!pendingAction}
        title={
          pendingAction?.type === 'activate'
            ? t('confirm.activateTitle')
            : t('confirm.deactivateTitle')
        }
        description={
          pendingAction?.type === 'activate'
            ? t('confirm.activateDesc', { name: pendingAction.product.productName })
            : pendingAction
              ? t('confirm.deactivateDesc', { name: pendingAction.product.productName })
              : undefined
        }
        confirmText={
          pendingAction?.type === 'activate'
            ? t('columns.activate')
            : t('columns.deactivate')
        }
        cancelText={t('confirm.cancel')}
        variant={pendingAction?.type === 'activate' ? 'default' : 'destructive'}
        loading={deactivating || activating}
        onConfirm={handleConfirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
