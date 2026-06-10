'use client'

import { useEffect, useState } from 'react'
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

export function CounterUpsertDialog({ open, branchId, branchName, counter, onClose }: Props) {
  const isEdit = !!counter
  const tCreate = useTranslations('admin.branches.counterCreateDialog')
  const tEdit = useTranslations('admin.branches.counterEditDialog')
  const t = isEdit ? tEdit : tCreate

  const [counterName, setCounterName] = useState('')

  useEffect(() => {
    if (open) setCounterName(counter?.counterName ?? '')
  }, [open, counter])

  const { mutate: create, isPending: creating } = useCreateCounter()
  const { mutate: update, isPending: updating } = useUpdateCounter()
  const isPending = creating || updating

  function handleSubmit() {
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
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!counterName.trim() || isPending}>
            {isPending && <Spinner className="mr-2" />}
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
