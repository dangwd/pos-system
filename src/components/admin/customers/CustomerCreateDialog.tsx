'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Select, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useCreateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import type { LoyaltyTier } from '@/types/customer'

const LOYALTY_TIERS: LoyaltyTier[] = ['silver', 'gold', 'platinum']

const schema = z.object({
  name:        z.string().min(1, 'Vui lòng nhập tên khách hàng'),
  phoneNumber: z.string().optional(),
  email:       z.string().refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Email không hợp lệ',
  ),
  address:     z.string().optional(),
  dateOfBirth: z.string().optional(),
  loyaltyTier: z.enum(['silver', 'gold', 'platinum']).optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function CustomerCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.customers.createDialog')
  const { mutate: create, isPending } = useCreateCustomer()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', phoneNumber: '', email: '', address: '', dateOfBirth: '', loyaltyTier: undefined,
    },
  })
  const { errors } = form.formState

  useEffect(() => {
    if (open) form.reset({ name: '', phoneNumber: '', email: '', address: '', dateOfBirth: '', loyaltyTier: undefined })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(values: FormValues) {
    create(
      {
        name: values.name.trim(),
        ...(values.phoneNumber  && { phoneNumber:  values.phoneNumber }),
        ...(values.email        && { email:        values.email }),
        ...(values.address      && { address:      values.address }),
        ...(values.dateOfBirth  && { dateOfBirth:  values.dateOfBirth }),
        ...(values.loyaltyTier  && { loyaltyTier:  values.loyaltyTier }),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
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
            <Label htmlFor="cc-name" className="text-sm font-medium">
              {t('name')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="cc-name" className="h-9" placeholder={t('namePlaceholder')} status={errors.name ? 'error' : undefined} {...form.register('name')} />
            <FieldError errors={[errors.name]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-phone" className="text-sm font-medium text-muted-foreground">
              {t('phone')}
            </Label>
            <Input id="cc-phone" className="h-9" placeholder={t('phonePlaceholder')} {...form.register('phoneNumber')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-muted-foreground">
              {t('loyaltyTier')}
            </Label>
            <Controller
              control={form.control}
              name="loyaltyTier"
              render={({ field }) => (
                <Select
                  value={field.value ?? undefined}
                  onChange={v => field.onChange(v ?? undefined)}
                  options={LOYALTY_TIERS.map(tier => ({ value: tier, label: tier }))}
                  allowClear
                  className="w-full"
                  popupMatchSelectWidth={false}
                />
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-email" className="text-sm font-medium text-muted-foreground">
              {t('email')}
            </Label>
            <Input id="cc-email" type="email" className="h-9" placeholder={t('emailPlaceholder')} status={errors.email ? 'error' : undefined} {...form.register('email')} />
            <FieldError errors={[errors.email]} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-address" className="text-sm font-medium text-muted-foreground">
              {t('address')}
            </Label>
            <Input id="cc-address" className="h-9" {...form.register('address')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cc-dob" className="text-sm font-medium text-muted-foreground">
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
