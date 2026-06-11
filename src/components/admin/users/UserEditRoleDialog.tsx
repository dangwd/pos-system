'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useUpdateUserRole } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

// Keyed inner component — remounts when `user` changes so roleId state
// always initializes from the current entity without a useEffect.
function EditRoleForm({
  user,
  isPending,
  onCancel,
  onSubmit,
}: {
  user: AdminUser
  isPending: boolean
  onCancel: () => void
  onSubmit: (roleId: string) => void
}) {
  const t = useTranslations('admin.users.editRoleDialog')
  const [roleId, setRoleId] = useState(() => user.role.id)

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
  })

  return (
    <>
      <Field className="py-1">
        <FieldLabel>{t('role')}</FieldLabel>
        <Select
          value={roleId || undefined}
          onChange={v => v && setRoleId(v)}
          options={roles.map(r => ({ value: r.id, label: r.name }))}
          notFoundContent="Không tìm thấy"
          className="w-full"
          popupMatchSelectWidth={false}
        />
      </Field>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>{t('cancel')}</Button>
        <Button onClick={() => onSubmit(roleId)} disabled={!roleId || isPending}>
          {isPending && <Spinner className="mr-2" />}
          {t('submit')}
        </Button>
      </DialogFooter>
    </>
  )
}

export function UserEditRoleDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.editRoleDialog')
  const { mutate: updateRole, isPending } = useUpdateUserRole()

  function handleSubmit(roleId: string) {
    if (!user) return
    updateRole({ id: user.id, dto: { roleId } }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title', { name: user?.fullName ?? '' })}</DialogTitle>
        </DialogHeader>
        {user && (
          <EditRoleForm
            key={user.id}
            user={user}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
