'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
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
  productTypes: Record<string, string>
}

export function createProductColumns(
  labels: ProductColumnLabels,
  onEdit: (product: Product) => void,
  onDeactivate: (product: Product) => void,
): TableColumnsType<Product> {
  return [
    {
      title: labels.product,
      dataIndex: 'productName',
      key: 'productName',
      sorter: (a, b) => a.productName.localeCompare(b.productName),
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    {
      title: labels.productCode,
      dataIndex: 'productCode',
      key: 'productCode',
      render: (value: string) => (
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      ),
    },
    {
      title: labels.category,
      dataIndex: 'category',
      key: 'category',
      render: (value: Product['category']) => (
        <Badge variant="secondary">{value.name}</Badge>
      ),
    },
    {
      title: labels.purity,
      dataIndex: 'purity',
      key: 'purity',
      render: (value: string) => (
        <span className="text-xs font-medium">{value}</span>
      ),
    },
    {
      title: labels.productType,
      dataIndex: 'productType',
      key: 'productType',
      render: (value: string) => (
        <span className="text-xs">{labels.productTypes[value] ?? value}</span>
      ),
    },
    {
      title: labels.status,
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'outline'}>
          {value ? labels.active : labels.inactive}
        </Badge>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, record: Product) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(record)}>
              {labels.edit}
            </DropdownMenuItem>
            {record.isActive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeactivate(record)}
                >
                  {labels.deactivate}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
