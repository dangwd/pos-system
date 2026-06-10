'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCreateBranch, useUpdateBranch } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Branch } from '@/types/branch'

interface Props {
  open: boolean
  branch?: Branch | null
  onClose: () => void
}

const EMPTY = { name: '', address: '', phone: '' }

export function BranchUpsertDialog({ open, branch, onClose }: Props) {
  const isEdit = !!branch
  const tCreate = useTranslations('admin.branches.createDialog')
  const tEdit = useTranslations('admin.branches.editDialog')
  const t = isEdit ? tEdit : tCreate

  const [form, setForm] = useState(EMPTY)
  const [isHQ, setIsHQ] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(branch ? { name: branch.name, address: branch.address, phone: branch.phone } : EMPTY)
      setIsHQ(branch?.isHeadquarters ?? false)
    }
  }, [open, branch])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { mutate: create, isPending: creating } = useCreateBranch()
  const { mutate: update, isPending: updating } = useUpdateBranch()
  const isPending = creating || updating

  const disabled = !form.name || !form.address || !form.phone

  function handleSubmit() {
    if (isEdit && branch) {
      update({ id: branch.id, dto: form }, { onSuccess: onClose })
    } else {
      create({ ...form, isHeadquarters: isHQ }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <FieldGroup className="py-1 gap-3">
          <Field>
            <FieldLabel htmlFor="b-name">{t('name')}</FieldLabel>
            <Input id="b-name" className="h-9" value={form.name} onChange={set('name')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="b-address">{t('address')}</FieldLabel>
            <Input id="b-address" className="h-9" value={form.address} onChange={set('address')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="b-phone">{t('phone')}</FieldLabel>
            <Input id="b-phone" className="h-9" value={form.phone} onChange={set('phone')} />
          </Field>
          {!isEdit && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHQ}
                onChange={e => setIsHQ(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              {tCreate('isHeadquarters')}
            </label>
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
