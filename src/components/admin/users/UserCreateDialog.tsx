'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useAuthStore } from '@/stores/auth.store'
import { useCreateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY_FORM = {
  employeeCode: '',
  fullName: '',
  phone: '',
  password: '',
  roleId: '',
  branchId: '',
  email: '',
  address: '',
  dateOfBirth: '',
}

export function UserCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.users.createDialog')
  const defaultBranchId = useAuthStore(s => s.user?.branchId) ?? ''
  const [form, setForm] = useState({ ...EMPTY_FORM, branchId: defaultBranchId })
  const [showOptional, setShowOptional] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: branches = [] } = useBranches()

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
    enabled: open,
  })

  const { mutate: create, isPending } = useCreateUser()

  const disabled = !form.employeeCode || !form.fullName || !form.phone || !form.password || !form.roleId || !form.branchId

  function handleSubmit() {
    const dto = {
      employeeCode: form.employeeCode,
      fullName: form.fullName,
      phone: form.phone,
      password: form.password,
      roleId: form.roleId,
      branchId: form.branchId,
      ...(form.email && { email: form.email }),
      ...(form.address && { address: form.address }),
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
    }
    create(dto, {
      onSuccess: () => {
        setForm({ ...EMPTY_FORM, branchId: defaultBranchId })
        setShowOptional(false)
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
            <FieldLabel>{t('branch')}</FieldLabel>
            <Combobox
              value={form.branchId || null}
              onValueChange={v => v && setForm(f => ({ ...f, branchId: v }))}
            >
              <ComboboxInput
                placeholder={t('branchPlaceholder')}
                className="h-9 w-full"
              />
              <ComboboxContent>
                <ComboboxList>
                  {branches.map(b => (
                    <ComboboxItem key={b.id} value={b.id}>{b.name}</ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>—</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>

          <Field>
            <FieldLabel>{t('role')}</FieldLabel>
            <Combobox
              value={form.roleId || null}
              onValueChange={v => v && setForm(f => ({ ...f, roleId: v }))}
            >
              <ComboboxInput
                placeholder={t('rolePlaceholder')}
                className="h-9 w-full"
              />
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

          <button
            type="button"
            onClick={() => setShowOptional(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors -mb-1"
          >
            {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t('optionalSection')}
          </button>

          {showOptional && (
            <>
              {(['email', 'address'] as const).map(field => (
                <Field key={field}>
                  <FieldLabel htmlFor={field}>{t(field)}</FieldLabel>
                  <Input id={field} className="h-9" value={form[field]} onChange={set(field)} />
                </Field>
              ))}
              <Field>
                <FieldLabel htmlFor="dateOfBirth">{t('dateOfBirth')}</FieldLabel>
                <Input
                  id="dateOfBirth"
                  type="date"
                  className="h-9"
                  value={form.dateOfBirth}
                  onChange={set('dateOfBirth')}
                />
              </Field>
            </>
          )}
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
