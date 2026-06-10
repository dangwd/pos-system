'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUpdateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
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
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export function UserEditInfoDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.editInfoDialog')

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    branchId: '',
    email: '',
    address: '',
    dateOfBirth: '',
  })

  const { data: branches = [] } = useBranches()

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName,
        phone: user.phone,
        branchId: user.branchId,
        email: user.email ?? '',
        address: user.address ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
      })
    }
  }, [user])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { mutate: update, isPending } = useUpdateUser()

  const disabled = !form.fullName || !form.phone || !form.branchId

  function handleSubmit() {
    if (!user) return
    const dto = {
      fullName: form.fullName,
      phone: form.phone,
      branchId: form.branchId,
      ...(form.email && { email: form.email }),
      ...(form.address && { address: form.address }),
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
    }
    update({ id: user.id, dto }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title', { name: user?.fullName ?? '' })}</DialogTitle>
        </DialogHeader>

        <FieldGroup className="py-1 gap-3">
          <Field>
            <FieldLabel htmlFor="ei-fullName">{t('fullName')}</FieldLabel>
            <Input id="ei-fullName" className="h-9" value={form.fullName} onChange={set('fullName')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ei-phone">{t('phone')}</FieldLabel>
            <Input id="ei-phone" className="h-9" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field>
            <FieldLabel>{t('branch')}</FieldLabel>
            <Select value={form.branchId} onValueChange={v => setForm(f => ({ ...f, branchId: v ?? f.branchId }))}>
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder={t('branchPlaceholder')}>
                  {(id: string | null) => id ? (branches.find(b => b.id === id)?.name ?? id) : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="ei-email">{t('email')}</FieldLabel>
            <Input id="ei-email" className="h-9" value={form.email} onChange={set('email')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ei-address">{t('address')}</FieldLabel>
            <Input id="ei-address" className="h-9" value={form.address} onChange={set('address')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="ei-dob">{t('dateOfBirth')}</FieldLabel>
            <Input id="ei-dob" type="date" className="h-9" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
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
