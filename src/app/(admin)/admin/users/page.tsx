'use client'

import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userRepository } from '@/lib/repositories/user.repository'
import { DataTable } from '@/components/pos/DataTable'
import { createUserColumns } from '@/components/pos/columns/user-columns'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import type { AdminUser } from '@/types/admin-user'

export default function UsersPage() {
  const t = useTranslations('admin.users')
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userRepository.getList(),
    staleTime: 60_000,
  })

  const { mutate: deactivate } = useMutation({
    mutationFn: (user: AdminUser) => userRepository.deactivate(user.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: () => {
      toast.error('Failed to deactivate user')
    },
  })

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
      deactivate:   t('columns.deactivate'),
      active:       t('status.active'),
      inactive:     t('status.inactive'),
      roleLabels: {
        Cashier:     t('roles.Cashier'),
        ThuQuy:      t('roles.ThuQuy'),
        Manager:     t('roles.Manager'),
        SystemAdmin: t('roles.SystemAdmin'),
      },
    },
    (user) => console.log('editRole', user.id),
    (user) => deactivate(user),
  ), [t, deactivate])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('subtitle', { count: users.length })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchKey="fullName"
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
    </div>
  )
}
