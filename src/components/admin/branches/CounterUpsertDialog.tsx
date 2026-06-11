'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCreateCounter, useUpdateCounter } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Counter } from '@/types/branch'

interface Props {
  open: boolean
  branchId: string
  branchName: string
  counter?: Counter | null
  onClose: () => void
}

// Keyed inner component — remounts when `counter` or `open` changes.
function CounterFormBody({
  counter,
  isEdit,
  branchName,
  isPending,
  onCancel,
  onSubmit,
}: {
  counter?: Counter | null
  isEdit: boolean
  branchName: string
  isPending: boolean
  onCancel: () => void
  onSubmit: (name: string) => void
}) {
  const tCreate = useTranslations('admin.branches.counterCreateDialog')
  const tEdit   = useTranslations('admin.branches.counterEditDialog')
  const t       = isEdit ? tEdit : tCreate

  const [counterName, setCounterName] = useState(() => counter?.counterName ?? '')

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? tEdit('title') : tCreate('title', { branchName })}
        </DialogTitle>
      </DialogHeader>

      <FieldGroup className="py-1">
        <Field>
          <FieldLabel htmlFor="counter-name">{t('counterName')}</FieldLabel>
          <Input
            id="counter-name"
            className="h-9"
            value={counterName}
            onChange={e => setCounterName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSubmit(counterName)}
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>{t('cancel')}</Button>
        <Button onClick={() => onSubmit(counterName)} disabled={!counterName.trim() || isPending}>
          {isPending && <Spinner className="mr-2" />}
          {t('submit')}
        </Button>
      </DialogFooter>
    </>
  )
}

export function CounterUpsertDialog({ open, branchId, branchName, counter, onClose }: Props) {
  const isEdit = !!counter

  const { mutate: create, isPending: creating } = useCreateCounter()
  const { mutate: update, isPending: updating } = useUpdateCounter()
  const isPending = creating || updating

  function handleSubmit(counterName: string) {
    if (!counterName.trim()) return
    if (isEdit && counter) {
      update({ branchId, counterId: counter.id, dto: { counterName } }, { onSuccess: onClose })
    } else {
      create({ branchId, dto: { counterName } }, { onSuccess: onClose })
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <CounterFormBody
          key={`${counter?.id ?? 'new'}-${open ? '1' : '0'}`}
          counter={counter}
          isEdit={isEdit}
          branchName={branchName}
          isPending={isPending}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  )
}
