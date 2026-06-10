'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import type { AdminUser } from '@/types/admin-user'

export interface UserColumnLabels {
  employeeCode: string
  fullName: string
  phone: string
  role: string
  status: string
  lastLogin: string
  openMenu: string
  viewDetail: string
  editRole: string
  activate: string
  deactivate: string
  resetPassword: string
  roleLabels: Record<string, string>
  active: string
  inactive: string
}

export function createUserColumns(
  labels: UserColumnLabels,
  onEditRole: (user: AdminUser) => void,
  onActivate: (user: AdminUser) => void,
  onDeactivate: (user: AdminUser) => void,
  onResetPassword: (user: AdminUser) => void,
): ColumnDef<AdminUser>[] {
  return [
    {
      accessorKey: 'employeeCode',
      header: labels.employeeCode,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'fullName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {labels.fullName}
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.getValue('fullName')}</div>,
    },
    {
      accessorKey: 'phone',
      header: labels.phone,
      cell: ({ getValue }) => (
        <span className="font-mono text-sm">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: labels.role,
      cell: ({ getValue }) => {
        const val = getValue() as { code?: string; name?: string } | string
        const code = typeof val === 'object' && val !== null
          ? (val.code ?? '')
          : (val as string)
        return <Badge variant="outline">{labels.roleLabels[code] ?? code}</Badge>
      },
    },
    {
      accessorKey: 'isActive',
      header: labels.status,
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? 'default' : 'secondary'}>
          {getValue() ? labels.active : labels.inactive}
        </Badge>
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: labels.lastLogin,
      cell: ({ getValue }) => {
        const val = getValue() as string | null
        if (!val) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-sm text-muted-foreground">
            {new Date(val).toLocaleDateString('lo-LA')}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{labels.openMenu}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditRole(user)}>
                {labels.editRole}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResetPassword(user)}>
                {labels.resetPassword}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.isActive ? (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeactivate(user)}
                >
                  {labels.deactivate}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onActivate(user)}>
                  {labels.activate}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
