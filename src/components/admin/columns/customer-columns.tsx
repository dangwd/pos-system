'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
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
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {labels.name}
          <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          {row.original.email && (
            <p className="text-[11px] text-muted-foreground">{row.original.email}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'phoneNumber',
      header: labels.phone,
      cell: ({ getValue }) => {
        const v = getValue() as string | null
        return v
          ? <span className="font-mono text-sm">{v}</span>
          : <span className="text-muted-foreground">—</span>
      },
    },
    {
      accessorKey: 'loyaltyTier',
      header: labels.loyalty,
      cell: ({ getValue }) => {
        const tier = getValue() as string | null
        if (!tier) return <span className="text-muted-foreground">—</span>
        const variantMap: Record<string, 'secondary' | 'outline' | 'default'> = {
          Bronze: 'secondary',
          Silver: 'outline',
          Gold: 'default',
          Platinum: 'default',
        }
        return <Badge variant={variantMap[tier] ?? 'secondary'}>{tier}</Badge>
      },
    },
    {
      accessorKey: 'accumulatedPoints',
      header: labels.points,
      cell: ({ getValue }) => (
        <span className="tabular-nums">{(getValue() as number).toLocaleString('lo-LA')}</span>
      ),
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
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">{labels.openMenu}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              {labels.edit}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
