'use client'

import type { TableColumnsType } from 'antd'
import { Badge } from '@/components/ui/badge'
import type { AdminUser } from '@/types/admin-user'

export interface UserColumnLabels {
  employeeCode: string
  fullName: string
  phone: string
  branch: string
  counter: string
  role: string
  status: string
  lastLogin: string
  roleLabels: Record<string, string>
  branchMap: Record<string, string>
  active: string
  inactive: string
}

export function createUserColumns(
  labels: UserColumnLabels,
): TableColumnsType<AdminUser> {
  return [
    {
      title: labels.employeeCode,
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      width: 120,
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      title: labels.fullName,
      dataIndex: 'fullName',
      key: 'fullName',
      sorter: (a, b) => (a.fullName ?? '').localeCompare(b.fullName ?? ''),
      render: (value: string) => <div className="font-medium">{value}</div>,
    },
    {
      title: labels.phone,
      dataIndex: 'phone',
      key: 'phone',
      render: (value: string) => (
        <span className="font-mono text-sm">{value}</span>
      ),
    },
    {
      title: labels.branch,
      dataIndex: 'branchId',
      key: 'branchId',
      render: (value: string) => {
        const name = labels.branchMap[value]
        return name
          ? <span className="text-sm">{name}</span>
          : <span className="font-mono text-xs text-muted-foreground">{value?.slice(0, 8)}…</span>
      },
    },
    {
      title: labels.counter,
      dataIndex: 'counterName',
      key: 'counterName',
      render: (value: string | null) =>
        value
          ? <span className="text-sm">{value}</span>
          : <span className="text-muted-foreground">—</span>,
    },
    {
      title: labels.role,
      dataIndex: 'role',
      key: 'role',
      render: (value: { code?: string; name?: string } | string) => {
        const code = typeof value === 'object' && value !== null
          ? (value.code ?? '')
          : (value as string)
        return <Badge variant="outline">{labels.roleLabels[code] ?? code}</Badge>
      },
    },
    {
      title: labels.status,
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (value: boolean) => (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? labels.active : labels.inactive}
        </Badge>
      ),
    },
    {
      title: labels.lastLogin,
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (value: string | null) => {
        if (!value) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(value).toLocaleDateString('lo-LA')}
          </span>
        )
      },
    },
  ]
}
