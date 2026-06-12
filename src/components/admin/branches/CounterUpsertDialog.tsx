'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useCreateCounter, useUpdateCounter } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter,
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
// submitRef is populated so the outer footer button can trigger submission.
function CounterFormBody({
  counter,
  submitRef,
}: {
  counter?: Counter | null
  submitRef: React.MutableRefObject<(() => string | null)>
}) {
  const [counterName, setCounterName] = useState(() => counter?.counterName ?? '')

  submitRef.current = () => counterName.trim() || null

  return (
    <FieldGroup className="py-1">
      <Field>
        <FieldLabel htmlFor="counter-name">ຊື່ຕູ້</FieldLabel>
        <Input
          id="counter-name"
          className="h-9"
          value={counterName}
          onChange={e => setCounterName(e.target.value)}
        />
      </Field>
    </FieldGroup>
  )
}

export function CounterUpsertDialog({ open, branchId, branchName, counter, onClose }: Props) {
  const isEdit = !!counter
  const tCreate = useTranslations('admin.branches.counterCreateDialog')
  const tEdit   = useTranslations('admin.branches.counterEditDialog')
  const t       = isEdit ? tEdit : tCreate

  const { mutate: create, isPending: creating } = useCreateCounter()
  const { mutate: update, isPending: updating } = useUpdateCounter()
  const isPending = creating || updating
  const submitRef = useRef<() => string | null>(() => null)

  function handleSubmit() {
    const counterName = submitRef.current()
    if (!counterName) return
    if (isEdit && counter) {
      update({ branchId, counterId: counter.id, dto: { counterName } }, { onSuccess: onClose })
    } else {
      create({ branchId, dto: { counterName } }, { onSuccess: onClose })
    }
  }

  const title = isEdit ? tEdit('title') : tCreate('title', { branchName })

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        title={title}
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
        <CounterFormBody
          key={`${counter?.id ?? 'new'}-${open ? '1' : '0'}`}
          counter={counter}
          submitRef={submitRef}
        />
      </DialogContent>
    </Dialog>
  )
}
