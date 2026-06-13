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
  openMenu: string
  viewDetail: string
  editInfo: string
  editRole: string
  activate: string
  deactivate: string
  resetPassword: string
  assignCounter: string
  roleLabels: Record<string, string>
  branchMap: Record<string, string>
  active: string
  inactive: string
}

export function createUserColumns(
  labels: UserColumnLabels,
  onEditInfo: (user: AdminUser) => void,
  onEditRole: (user: AdminUser) => void,
  onActivate: (user: AdminUser) => void,
  onDeactivate: (user: AdminUser) => void,
  onResetPassword: (user: AdminUser) => void,
  onAssignCounter: (user: AdminUser) => void,
): TableColumnsType<AdminUser> {
  return [
    {
      title: labels.employeeCode,
      dataIndex: 'employeeCode',
      key: 'employeeCode',
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
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, record: AdminUser) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditInfo(record)}>
              {labels.editInfo}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEditRole(record)}>
              {labels.editRole}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResetPassword(record)}>
              {labels.resetPassword}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAssignCounter(record)}>
              {labels.assignCounter}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {record.isActive ? (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeactivate(record)}
              >
                {labels.deactivate}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onActivate(record)}>
                {labels.activate}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
