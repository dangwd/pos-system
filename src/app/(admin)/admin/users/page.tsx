'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { DataTable } from '@/components/shared/DataTable'
import { createUserColumns } from '@/components/admin/columns/user-columns'
import { UserCreateDialog } from '@/components/admin/users/UserCreateDialog'
import { UserEditInfoDialog } from '@/components/admin/users/UserEditInfoDialog'
import { UserEditRoleDialog } from '@/components/admin/users/UserEditRoleDialog'
import { UserResetPasswordDialog } from '@/components/admin/users/UserResetPasswordDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useUsers, useActivateUser, useDeactivateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import type { AdminUser } from '@/types/admin-user'

const ALL = '__all__'

export default function UsersPage() {
  const t = useTranslations('admin.users')

  const [createOpen, setCreateOpen] = useState(false)
  const [editInfoUser, setEditInfoUser] = useState<AdminUser | null>(null)
  const [editRoleUser, setEditRoleUser] = useState<AdminUser | null>(null)
  const [resetPwUser, setResetPwUser] = useState<AdminUser | null>(null)
  const [filterBranchId, setFilterBranchId] = useState<string>(ALL)
  const [filterIsActive, setFilterIsActive] = useState<string>(ALL)
  const [searchInput, setSearchInput] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setFilterSearch(searchInput), 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: branches = [] } = useBranches()
  const branchMap = useMemo(
    () => Object.fromEntries(branches.map(b => [b.id, b.name])),
    [branches],
  )

  const { data: users = [], isLoading } = useUsers({
    branchId: filterBranchId !== ALL ? filterBranchId : undefined,
    search: filterSearch || undefined,
    isActive: filterIsActive !== ALL ? (filterIsActive === 'active') : undefined,
  })
  const { mutate: activate } = useActivateUser()
  const { mutate: deactivate } = useDeactivateUser()

  const columns = useMemo(() => createUserColumns(
    {
      employeeCode: t('columns.employeeCode'),
      fullName:     t('columns.fullName'),
      phone:        t('columns.phone'),
      branch:       t('columns.branch'),
      counter:      t('columns.counter'),
      role:         t('columns.role'),
      status:       t('columns.status'),
      lastLogin:    t('columns.lastLogin'),
      openMenu:     t('columns.openMenu'),
      viewDetail:   t('columns.viewDetail'),
      editInfo:     t('columns.editInfo'),
      editRole:     t('columns.editRole'),
      activate:     t('columns.activate'),
      deactivate:   t('columns.deactivate'),
      resetPassword: t('columns.resetPassword'),
      active:       t('status.active'),
      inactive:     t('status.inactive'),
      branchMap,
      roleLabels: {
        Cashier:     t('roles.Cashier'),
        ThuQuy:      t('roles.ThuQuy'),
        Manager:     t('roles.Manager'),
        SystemAdmin: t('roles.SystemAdmin'),
      },
    },
    (user) => setEditInfoUser(user),
    (user) => setEditRoleUser(user),
    (user) => activate(user.id),
    (user) => deactivate(user.id),
    (user) => setResetPwUser(user),
  ), [t, branchMap, activate, deactivate])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle', { count: users.length })}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('addButton')}
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="h-8 w-56 text-sm"
        />
        <Select value={filterBranchId} onValueChange={v => setFilterBranchId(v ?? ALL)}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder={t('filterAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAll')}</SelectItem>
            {branches.map(b => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterIsActive} onValueChange={v => setFilterIsActive(v ?? ALL)}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder={t('filterAllStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('filterAllStatus')}</SelectItem>
            <SelectItem value="active">{t('status.active')}</SelectItem>
            <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={users}
          hideSearch
        />
      )}

      <UserCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserEditInfoDialog user={editInfoUser} onClose={() => setEditInfoUser(null)} />
      <UserEditRoleDialog user={editRoleUser} onClose={() => setEditRoleUser(null)} />
      <UserResetPasswordDialog user={resetPwUser} onClose={() => setResetPwUser(null)} />
    </div>
  )
}
