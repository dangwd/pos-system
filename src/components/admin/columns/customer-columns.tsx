'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { Customer } from '@/types/customer'

export interface CustomerColumnLabels {
  name: string
  phone: string
  email: string
  loyalty: string
  points: string
  status: string
  openMenu: string
  viewDetail: string
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
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, record: Customer) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(record)}>
              {labels.edit}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
