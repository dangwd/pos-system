'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import { EditOutlined } from '@ant-design/icons'
import type { Customer } from '@/types/customer'

export interface CustomerColumnLabels {
  name: string
  phone: string
  email: string
  loyalty: string
  points: string
  status: string
  actions: string
  edit: string
  active: string
  inactive: string
}

export function createCustomerColumns(
  labels: CustomerColumnLabels,
  onEdit: (customer: Customer) => void,
): TableColumnsType<Customer> {
  return [
    {
      title: labels.name,
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
      render: (value: string, record: Customer) => (
        <div>
          <p className="font-medium">{value}</p>
          {record.email && (
            <p className="text-[11px] text-muted-foreground">{record.email}</p>
          )}
        </div>
      ),
    },
    {
      title: labels.phone,
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (value: string | null) =>
        value
          ? <span className="font-mono text-sm">{value}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      title: labels.loyalty,
      dataIndex: 'loyaltyTier',
      key: 'loyaltyTier',
      render: (value: string | null) => {
        if (!value) return <span className="text-muted-foreground">—</span>
        const variantMap: Record<string, 'secondary' | 'outline' | 'default'> = {
          Bronze: 'secondary',
          Silver: 'outline',
          Gold: 'default',
          Platinum: 'default',
        }
        return <Badge variant={variantMap[value] ?? 'secondary'}>{value}</Badge>
      },
    },
    {
      title: labels.points,
      dataIndex: 'accumulatedPoints',
      key: 'accumulatedPoints',
      sorter: (a, b) => (a.accumulatedPoints ?? 0) - (b.accumulatedPoints ?? 0),
      render: (value: number) => (
        <span className="tabular-nums">{value.toLocaleString('lo-LA')}</span>
      ),
    },
    {
      title: labels.status,
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? labels.active : labels.inactive}
        </Badge>
      ),
    },
    {
      title: labels.actions,
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Customer) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(record)}
            title={labels.edit}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <EditOutlined />
          </button>
        </div>
      ),
    },
  ]
}
