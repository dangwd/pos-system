'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCreateBranch, useUpdateBranch } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter,
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

type FormData = typeof EMPTY

// Keyed inner component — remounts when `branch` or `open` changes so
// useState initializers always reflect the current entity.
// submitRef is populated so the outer footer button can trigger submission.
function BranchFormBody({
  branch,
  isEdit,
  submitRef,
}: {
  branch?: Branch | null
  isEdit: boolean
  submitRef: React.MutableRefObject<(() => { form: FormData; isHQ: boolean } | null)>
}) {
  const tCreate = useTranslations('admin.branches.createDialog')
  const tEdit   = useTranslations('admin.branches.editDialog')
  const t       = isEdit ? tEdit : tCreate

  const [form, setForm] = useState<FormData>(
    () => branch ? { name: branch.name, address: branch.address, phone: branch.phone } : EMPTY
  )
  const [isHQ, setIsHQ] = useState(() => branch?.isHeadquarters ?? false)

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  submitRef.current = () => (form.name && form.address && form.phone ? { form, isHQ } : null)

  return (
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
  )
}

export function BranchUpsertDialog({ open, branch, onClose }: Props) {
  const isEdit = !!branch
  const tCreate = useTranslations('admin.branches.createDialog')
  const tEdit   = useTranslations('admin.branches.editDialog')
  const t       = isEdit ? tEdit : tCreate

  const { mutate: create, isPending: creating } = useCreateBranch()
  const { mutate: update, isPending: updating } = useUpdateBranch()
  const isPending = creating || updating
  const submitRef = useRef<() => { form: FormData; isHQ: boolean } | null>(() => null)

  function handleSubmit() {
    const data = submitRef.current()
    if (!data) return
    if (isEdit && branch) {
      update({ id: branch.id, dto: data.form }, { onSuccess: onClose })
    } else {
      create({ ...data.form, isHeadquarters: data.isHQ }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={t('title')}
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
        <BranchFormBody
          key={`${branch?.id ?? 'new'}-${open ? '1' : '0'}`}
          branch={branch}
          isEdit={isEdit}
          submitRef={submitRef}
        />
      </DialogContent>
    </Dialog>
  )
}
