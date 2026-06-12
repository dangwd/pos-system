'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { Select } from 'antd'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { DataTable } from '@/components/shared/DataTable'
import { createUserColumns } from '@/components/admin/columns/user-columns'
import { UserCreateDialog } from '@/components/admin/users/UserCreateDialog'
import { UserEditInfoDialog } from '@/components/admin/users/UserEditInfoDialog'
import { UserEditRoleDialog } from '@/components/admin/users/UserEditRoleDialog'
import { UserResetPasswordDialog } from '@/components/admin/users/UserResetPasswordDialog'
import { UserAssignCounterDialog } from '@/components/admin/users/UserAssignCounterDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUsersPaged, useActivateUser, useDeactivateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import type { AdminUser } from '@/types/admin-user'

const PAGE_SIZE = 20

export default function UsersPage() {
  const t = useTranslations('admin.users')

  const [createOpen, setCreateOpen] = useState(false)
  const [editInfoUser, setEditInfoUser] = useState<AdminUser | null>(null)
  const [editRoleUser, setEditRoleUser] = useState<AdminUser | null>(null)
  const [resetPwUser, setResetPwUser] = useState<AdminUser | null>(null)
  const [assignCounterUser, setAssignCounterUser] = useState<AdminUser | null>(null)
  const [filterBranchId, setFilterBranchId] = useState<string | null>(null)
  const [filterIsActive, setFilterIsActive] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => { setFilterSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const { data: branches = [] } = useBranches()
  const branchMap = useMemo(
    () => Object.fromEntries(branches.map(b => [b.id, b.name])),
    [branches],
  )

  const { data, isLoading } = useUsersPaged({
    branchId: filterBranchId ?? undefined,
    search: filterSearch || undefined,
    isActive: filterIsActive !== null ? (filterIsActive === 'active') : undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const users = data?.data ?? []
  const { mutate: activate } = useActivateUser()
  const { mutate: deactivate } = useDeactivateUser()

  const columns = useMemo(() => createUserColumns(
    {
      employeeCode:  t('columns.employeeCode'),
      fullName:      t('columns.fullName'),
      phone:         t('columns.phone'),
      branch:        t('columns.branch'),
      counter:       t('columns.counter'),
      role:          t('columns.role'),
      status:        t('columns.status'),
      lastLogin:     t('columns.lastLogin'),
      openMenu:      t('columns.openMenu'),
      viewDetail:    t('columns.viewDetail'),
      editInfo:      t('columns.editInfo'),
      editRole:      t('columns.editRole'),
      activate:      t('columns.activate'),
      deactivate:    t('columns.deactivate'),
      resetPassword:  t('columns.resetPassword'),
      assignCounter:  t('columns.assignCounter'),
      active:         t('status.active'),
      inactive:      t('status.inactive'),
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
    (user) => setAssignCounterUser(user),
  ), [t, branchMap, activate, deactivate])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('subtitle', { count: data?.total ?? 0 })}
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
          className=" w-56 text-sm"
        />

        {/* Branch */}
        <Select
          value={filterBranchId || undefined}
          onChange={v => { setFilterBranchId(v ?? null); setPage(1) }}
          placeholder={t('filterAll')}
          options={branches.map(b => ({ value: b.id, label: b.name }))}
          showSearch
          allowClear
          filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
          notFoundContent="Không tìm thấy"
          className="min-w-48"
          popupMatchSelectWidth={false}
        />

        {/* Active status */}
        <Select
          value={filterIsActive || undefined}
          onChange={v => { setFilterIsActive(v ?? null); setPage(1) }}
          placeholder={t('filterAllStatus')}
          options={[
            { value: 'active', label: t('status.active') },
            { value: 'inactive', label: t('status.inactive') },
          ]}
          allowClear
          className="min-w-36"
          popupMatchSelectWidth={false}
        />
      </div>

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={users}
          hideSearch
          serverPagination={data ? {
            total: data.total,
            page: data.page,
            pageSize: data.pageSize,
            onPageChange: setPage,
          } : undefined}
        />
      )}

      <UserCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserEditInfoDialog user={editInfoUser} onClose={() => setEditInfoUser(null)} />
      <UserEditRoleDialog user={editRoleUser} onClose={() => setEditRoleUser(null)} />
      <UserResetPasswordDialog user={resetPwUser} onClose={() => setResetPwUser(null)} />
      <UserAssignCounterDialog user={assignCounterUser} onClose={() => setAssignCounterUser(null)} />
    </div>
  )
}
