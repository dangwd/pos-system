'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useCreateCounter, useUpdateCounter } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { Counter } from '@/types/branch'

const schema = z.object({
  counterName: z.string().min(1, 'Vui lòng nhập tên quầy'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  branchId: string
  branchName: string
  counter?: Counter | null
  onClose: () => void
}

export function CounterUpsertDialog({ open, branchId, branchName, counter, onClose }: Props) {
  const isEdit  = !!counter
  const tCreate = useTranslations('admin.branches.counterCreateDialog')
  const tEdit   = useTranslations('admin.branches.counterEditDialog')
  const t       = isEdit ? tEdit : tCreate

  const { mutate: create, isPending: creating } = useCreateCounter()
  const { mutate: update, isPending: updating } = useUpdateCounter()
  const isPending = creating || updating

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { counterName: '' },
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) form.reset({ counterName: counter?.counterName ?? '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, counter])

  function handleSubmit(values: FormValues) {
    if (isEdit && counter) {
      update(
        { branchId, counterId: counter.id, dto: { counterName: values.counterName } },
        { onSuccess: onClose },
      )
    } else {
      create(
        { branchId, dto: { counterName: values.counterName } },
        { onSuccess: onClose },
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        title={isEdit ? tEdit('title') : tCreate('title', { branchName })}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col gap-1.5 py-1">
          <Label htmlFor="counter-name" className="text-sm font-medium">
            {t('counterName')} <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input id="counter-name" className="h-9" status={errors.counterName ? 'error' : undefined} {...form.register('counterName')} />
          <FieldError errors={[errors.counterName]} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
