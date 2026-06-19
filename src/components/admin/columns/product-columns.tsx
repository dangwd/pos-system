'use client'

import { Badge } from '@/components/ui/badge'
import type { ColumnsType } from 'antd/es/table'
import type { Product } from '@/types/product'

export interface ProductColumnLabels {
  product: string
  productCode: string
  category: string
  purity: string
  unit: string
  status: string
  active: string
  inactive: string
}

export function createProductColumns(
  labels: ProductColumnLabels,
  unitMap: Map<string, string>,
): ColumnsType<Product> {
  return [
    {
      key: 'productName',
      dataIndex: 'productName',
      title: labels.product,
      ellipsis: true,
      sorter: true,
      render: (v: string) => <span className="font-medium">{v}</span>,
    },
    {
      key: 'productCode',
      dataIndex: 'productCode',
      title: labels.productCode,
      width: 140,
      render: (v: string) => (
        <span className="font-mono text-xs text-muted-foreground">{v}</span>
      ),
    },
    {
      key: 'category',
      dataIndex: 'category',
      title: labels.category,
      width: 110,
      render: (v: Product['category']) => <Badge variant="secondary">{v.name}</Badge>,
    },
    {
      key: 'purity',
      dataIndex: 'purity',
      title: labels.purity,
      width: 100,
      render: (v: string | null) => (
        <span className="text-xs font-medium">{v ?? '—'}</span>
      ),
    },
    {
      key: 'weightUnitId',
      dataIndex: 'weightUnitId',
      title: labels.unit,
      width: 100,
      render: (v: string | null) => (
        <span className="text-xs">{(v ? unitMap.get(v) : null) ?? '—'}</span>
      ),
    },
    {
      key: 'isActive',
      dataIndex: 'isActive',
      title: labels.status,
      width: 110,
      render: (v: boolean) => (
        <Badge variant={v ? 'default' : 'secondary'}>
          {v ? labels.active : labels.inactive}
        </Badge>
      ),
    },
  ]
}
