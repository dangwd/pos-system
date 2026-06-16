'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Select, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useUpdateUser } from '@/hooks/useUsers'
import { useBranches } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { AdminUser } from '@/types/admin-user'

const schema = z.object({
  fullName:    z.string().min(1, 'Vui lòng nhập họ và tên'),
  phone:       z.string().min(1, 'Vui lòng nhập số điện thoại'),
  branchId:    z.string().min(1, 'Vui lòng chọn chi nhánh'),
  email:       z.string().refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Email không hợp lệ',
  ),
  address:     z.string().optional(),
  dateOfBirth: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export function UserEditInfoDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.editInfoDialog')
  const { mutate: update, isPending } = useUpdateUser()
  const { data: branches = [] } = useBranches()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '', phone: '', branchId: '', email: '', address: '', dateOfBirth: '',
    },
  })
  const { errors } = form.formState

  useEffect(() => {
    if (user) {
      form.reset({
        fullName:    user.fullName,
        phone:       user.phone,
        branchId:    user.branchId,
        email:       user.email ?? '',
        address:     user.address ?? '',
        dateOfBirth: user.dateOfBirth ?? '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function handleSubmit(values: FormValues) {
    if (!user) return
    update(
      {
        id: user.id,
        dto: {
          fullName:  values.fullName,
          phone:     values.phone,
          branchId:  values.branchId,
          ...(values.email       && { email:       values.email }),
          ...(values.address     && { address:     values.address }),
          ...(values.dateOfBirth && { dateOfBirth: values.dateOfBirth }),
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        title={t('title', { name: user?.fullName ?? '' })}
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
            <Label htmlFor="ei-fullName" className="text-sm font-medium">
              {t('fullName')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Controller
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <Input
                  id="ei-fullName"
                  className="h-9"
                  status={errors.fullName ? 'error' : undefined}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />
            <FieldError errors={[errors.fullName]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ei-phone" className="text-sm font-medium">
              {t('phone')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <Input
                  id="ei-phone"
                  className="h-9"
                  status={errors.phone ? 'error' : undefined}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />
            <FieldError errors={[errors.phone]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {t('branch')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Controller
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onChange={v => field.onChange(v ?? '')}
                  placeholder={t('branchPlaceholder')}
                  options={branches.map(b => ({ value: b.id, label: b.name }))}
                  showSearch={{ filterOption: (input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }}
                  notFoundContent="Không tìm thấy"
                  className="w-full"
                  popupMatchSelectWidth={false}
                />
              )}
            />
            <FieldError errors={[errors.branchId]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ei-email" className="text-sm font-medium text-muted-foreground">
              {t('email')}
            </Label>
            <Controller
              control={form.control}
              name="email"
              render={({ field }) => (
                <Input
                  id="ei-email"
                  className="h-9"
                  type="email"
                  placeholder="example@email.com"
                  status={errors.email ? 'error' : undefined}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />
            <FieldError errors={[errors.email]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ei-address" className="text-sm font-medium text-muted-foreground">
              {t('address')}
            </Label>
            <Controller
              control={form.control}
              name="address"
              render={({ field }) => (
                <Input
                  id="ei-address"
                  className="h-9"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ei-dob" className="text-sm font-medium text-muted-foreground">
              {t('dateOfBirth')}
            </Label>
            <Controller
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <DatePicker
                  value={field.value ? dayjs(field.value) : null}
                  onChange={d => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                  format="DD/MM/YYYY"
                  placeholder="DD/MM/YYYY"
                  allowClear
                  className="w-full h-9"
                />
              )}
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
