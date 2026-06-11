'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { useUpdateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

type FormData = {
  fullName: string
  phone: string
  branchId: string
  email: string
  address: string
  dateOfBirth: string
}

// Keyed inner component — remounts when `user` changes so form state
// always initializes from the current entity without a useEffect.
function EditInfoForm({
  user,
  isPending,
  onCancel,
  onSubmit,
}: {
  user: AdminUser
  isPending: boolean
  onCancel: () => void
  onSubmit: (dto: FormData) => void
}) {
  const t = useTranslations('admin.users.editInfoDialog')
  const { data: branches = [] } = useBranches()

  const [form, setForm] = useState<FormData>(() => ({
    fullName: user.fullName,
    phone: user.phone,
    branchId: user.branchId,
    email: user.email ?? '',
    address: user.address ?? '',
    dateOfBirth: user.dateOfBirth ?? '',
  }))

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const disabled = !form.fullName || !form.phone || !form.branchId

  return (
    <>
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
          <Select
            value={form.branchId || undefined}
            onChange={v => v && setForm(f => ({ ...f, branchId: v }))}
            placeholder={t('branchPlaceholder')}
            options={branches.map(b => ({ value: b.id, label: b.name }))}
            showSearch
            filterOption={(input, opt) => (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())}
            notFoundContent="Không tìm thấy"
            className="w-full"
            popupMatchSelectWidth={false}
          />
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
        <Button variant="outline" onClick={onCancel} disabled={isPending}>{t('cancel')}</Button>
        <Button onClick={() => onSubmit(form)} disabled={disabled || isPending}>
          {isPending && <Spinner className="mr-2" />}
          {t('submit')}
        </Button>
      </DialogFooter>
    </>
  )
}

export function UserEditInfoDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.editInfoDialog')
  const { mutate: update, isPending } = useUpdateUser()

  function handleSubmit(form: FormData) {
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
        {user && (
          <EditInfoForm
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
