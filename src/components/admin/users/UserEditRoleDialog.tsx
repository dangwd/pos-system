'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useUpdateUserRole } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

// Keyed inner component — remounts when `user` changes so roleId state
// always initializes from the current entity without a useEffect.
// submitRef is populated so the outer footer button can trigger submission.
function EditRoleForm({
  user,
  submitRef,
}: {
  user: AdminUser
  submitRef: React.MutableRefObject<(() => string | null)>
}) {
  const t = useTranslations('admin.users.editRoleDialog')
  const [roleId, setRoleId] = useState(() => user.role.id)

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
  })

  submitRef.current = () => roleId || null

  return (
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
  )
}

export function UserEditRoleDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.editRoleDialog')
  const { mutate: updateRole, isPending } = useUpdateUserRole()
  const submitRef = useRef<() => string | null>(() => null)

  function handleSubmit() {
    if (!user) return
    const roleId = submitRef.current()
    if (!roleId) return
    updateRole({ id: user.id, dto: { roleId } }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={t('title', { name: user?.fullName ?? '' })}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        {user && (
          <EditRoleForm
            key={user.id}
            user={user}
            submitRef={submitRef}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
