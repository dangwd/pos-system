'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircleOutlined, EditOutlined, StopOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Product } from '@/types/product'

export interface ProductColumnLabels {
  product: string
  productCode: string
  category: string
  purity: string
  productType: string
  status: string
  active: string
  inactive: string
  openMenu: string
  edit: string
  deactivate: string
  activate: string
  actions: string
  productTypes: Record<string, string>
}

export function createProductColumns(
  labels: ProductColumnLabels,
  onEdit: (product: Product) => void,
  onDeactivate: (product: Product) => void,
  onActivate: (product: Product) => void,
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
      key: 'productType',
      dataIndex: 'productType',
      title: labels.productType,
      width: 130,
      render: (v: string) => (
        <span className="text-xs">{labels.productTypes[v] ?? v}</span>
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
    {
      key: 'actions',
      title: labels.actions,
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: Product) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(record)}
            title={labels.edit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <EditOutlined />
          </button>
          {record.isActive ? (
            <button
              type="button"
              onClick={() => onDeactivate(record)}
              title={labels.deactivate}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base text-destructive transition-colors hover:bg-destructive/10"
            >
              <StopOutlined />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onActivate(record)}
              title={labels.activate}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base text-primary transition-colors hover:bg-primary/10"
            >
              <CheckCircleOutlined />
            </button>
          )}
        </div>
      ),
    },
  ]
}
