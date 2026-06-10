'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useAuthStore } from '@/stores/auth.store'
import { useCreateUser } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY_FORM = { employeeCode: '', fullName: '', phone: '', password: '', roleId: '' }

export function UserCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.users.createDialog')
  const branchId = useAuthStore(s => s.user?.branchId) ?? ''
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
    enabled: open,
  })

  const { mutate: create, isPending } = useCreateUser()

  const disabled = !form.employeeCode || !form.fullName || !form.phone || !form.password || !form.roleId

  function handleSubmit() {
    create({ ...form, branchId }, {
      onSuccess: () => {
        setForm(EMPTY_FORM)
        onClose()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <FieldGroup className="py-1 gap-3">
          {(['employeeCode', 'fullName', 'phone', 'password'] as const).map(field => (
            <Field key={field}>
              <FieldLabel htmlFor={field}>{t(field)}</FieldLabel>
              <Input
                id={field}
                type={field === 'password' ? 'password' : 'text'}
                className="h-9"
                value={form[field]}
                onChange={set(field)}
              />
            </Field>
          ))}

          <Field>
            <FieldLabel>{t('role')}</FieldLabel>
            <Select value={form.roleId} onValueChange={v => setForm(f => ({ ...f, roleId: v ?? '' }))}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder={t('rolePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={disabled || isPending}>
            {isPending && <Spinner className="mr-2" />}
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
