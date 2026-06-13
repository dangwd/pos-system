'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useCreateBranch, useUpdateBranch } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { Branch } from '@/types/branch'

const schema = z.object({
  name:    z.string().min(1, 'Vui lòng nhập tên chi nhánh'),
  address: z.string().min(1, 'Vui lòng nhập địa chỉ'),
  phone:   z.string().min(1, 'Vui lòng nhập số điện thoại'),
  isHeadquarters: z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  branch?: Branch | null
  onClose: () => void
}

export function BranchUpsertDialog({ open, branch, onClose }: Props) {
  const isEdit  = !!branch
  const tCreate = useTranslations('admin.branches.createDialog')
  const tEdit   = useTranslations('admin.branches.editDialog')
  const t       = isEdit ? tEdit : tCreate

  const { mutate: create, isPending: creating } = useCreateBranch()
  const { mutate: update, isPending: updating } = useUpdateBranch()
  const isPending = creating || updating

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', phone: '', isHeadquarters: false },
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) {
      form.reset({
        name:           branch?.name    ?? '',
        address:        branch?.address ?? '',
        phone:          branch?.phone   ?? '',
        isHeadquarters: branch?.isHeadquarters ?? false,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branch])

  function handleSubmit(values: FormValues) {
    if (isEdit && branch) {
      update(
        { id: branch.id, dto: { name: values.name, address: values.address, phone: values.phone } },
        { onSuccess: onClose },
      )
    } else {
      create(
        { name: values.name, address: values.address, phone: values.phone, isHeadquarters: values.isHeadquarters },
        { onSuccess: onClose },
      )
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
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col gap-4 py-1">

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-name" className="text-sm font-medium">
              {t('name')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="b-name" className="h-9" status={errors.name ? 'error' : undefined} {...form.register('name')} />
            <FieldError errors={[errors.name]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-address" className="text-sm font-medium">
              {t('address')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="b-address" className="h-9" status={errors.address ? 'error' : undefined} {...form.register('address')} />
            <FieldError errors={[errors.address]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="b-phone" className="text-sm font-medium">
              {t('phone')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="b-phone" className="h-9" status={errors.phone ? 'error' : undefined} {...form.register('phone')} />
            <FieldError errors={[errors.phone]} />
          </div>

          {!isEdit && (
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border"
                {...form.register('isHeadquarters')}
              />
              {tCreate('isHeadquarters')}
            </label>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
