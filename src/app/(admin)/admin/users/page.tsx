'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { TablePageSkeleton } from '@/components/shared/PageSkeleton'
import { DataTable } from '@/components/shared/DataTable'
import { createUserColumns } from '@/components/admin/columns/user-columns'
import { UserCreateDialog } from '@/components/admin/users/UserCreateDialog'
import { UserEditRoleDialog } from '@/components/admin/users/UserEditRoleDialog'
import { UserResetPasswordDialog } from '@/components/admin/users/UserResetPasswordDialog'
import { Button } from '@/components/ui/button'
import { useUsers, useActivateUser, useDeactivateUser } from '@/hooks/useUsers'
import type { AdminUser } from '@/types/admin-user'

export default function UsersPage() {
  const t = useTranslations('admin.users')

  const [createOpen, setCreateOpen] = useState(false)
  const [editRoleUser, setEditRoleUser] = useState<AdminUser | null>(null)
  const [resetPwUser, setResetPwUser] = useState<AdminUser | null>(null)

  const { data: users = [], isLoading } = useUsers()
  const { mutate: activate } = useActivateUser()
  const { mutate: deactivate } = useDeactivateUser()

  const columns = useMemo(() => createUserColumns(
    {
      employeeCode: t('columns.employeeCode'),
      fullName:     t('columns.fullName'),
      phone:        t('columns.phone'),
      role:         t('columns.role'),
      status:       t('columns.status'),
      lastLogin:    t('columns.lastLogin'),
      openMenu:     t('columns.openMenu'),
      viewDetail:   t('columns.viewDetail'),
      editRole:     t('columns.editRole'),
      activate:     t('columns.activate'),
      deactivate:   t('columns.deactivate'),
      resetPassword: t('columns.resetPassword'),
      active:       t('status.active'),
      inactive:     t('status.inactive'),
      roleLabels: {
        Cashier:     t('roles.Cashier'),
        ThuQuy:      t('roles.ThuQuy'),
        Manager:     t('roles.Manager'),
        SystemAdmin: t('roles.SystemAdmin'),
      },
    },
    (user) => setEditRoleUser(user),
    (user) => activate(user.id),
    (user) => deactivate(user.id),
    (user) => setResetPwUser(user),
  ), [t, activate, deactivate])

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

      {isLoading ? <TablePageSkeleton /> : (
        <DataTable
          columns={columns}
          data={users}
          searchKey="fullName"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}

      <UserCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserEditRoleDialog user={editRoleUser} onClose={() => setEditRoleUser(null)} />
      <UserResetPasswordDialog user={resetPwUser} onClose={() => setResetPwUser(null)} />
    </div>
  )
}
