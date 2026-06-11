'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useUpdateUserRole } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export function UserEditRoleDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.editRoleDialog')
  const [roleId, setRoleId] = useState('')

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
    enabled: !!user,
  })

  useEffect(() => {
    if (user) setRoleId(user.role.id)
  }, [user])

  const { mutate: updateRole, isPending } = useUpdateUserRole()

  function handleSubmit() {
    updateRole({ id: user!.id, dto: { roleId } }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title', { name: user?.fullName ?? '' })}</DialogTitle>
        </DialogHeader>

        <Field className="py-1">
          <FieldLabel>{t('role')}</FieldLabel>
          <Combobox
            value={roleId || null}
            onValueChange={v => v && setRoleId(v)}
          >
            <ComboboxInput className="h-9 w-full" />
            <ComboboxContent>
              <ComboboxList>
                {roles.map(r => (
                  <ComboboxItem key={r.id} value={r.id}>{r.name}</ComboboxItem>
                ))}
              </ComboboxList>
              <ComboboxEmpty>—</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!roleId || isPending}>
            {isPending && <Spinner className="mr-2" />}
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
