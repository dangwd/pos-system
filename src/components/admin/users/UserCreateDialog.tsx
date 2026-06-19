'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Select, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useAuthStore } from '@/stores/auth.store'
import { useCreateUser } from '@/hooks/useUsers'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

const schema = z.object({
  employeeCode: z.string().min(1, 'Vui lòng nhập mã nhân viên'),
  fullName:     z.string().min(1, 'Vui lòng nhập họ và tên'),
  phone:        z.string().min(1, 'Vui lòng nhập số điện thoại'),
  password:     z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  roleId:       z.string().min(1, 'Vui lòng chọn vai trò'),
  branchId:     z.string().min(1, 'Vui lòng chọn chi nhánh'),
  counterId:    z.string().optional(),
  email:        z.string().refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Email không hợp lệ',
  ),
  address:     z.string().optional(),
  dateOfBirth: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function UserCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.users.createDialog')
  const defaultBranchId = useAuthStore(s => s.user?.branchId) ?? ''

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeCode: '',
      fullName: '',
      phone: '',
      password: '',
      roleId: '',
      branchId: defaultBranchId,
      counterId: '',
      email: '',
      address: '',
      dateOfBirth: '',
    },
  })

  const { errors } = form.formState
  const branchId = form.watch('branchId')

  useEffect(() => {
    if (open) {
      form.reset({
        employeeCode: '',
        fullName: '',
        phone: '',
        password: '',
        roleId: '',
        branchId: defaultBranchId,
        counterId: '',
        email: '',
        address: '',
        dateOfBirth: '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(branchId || null)

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
    enabled: open,
  })

  const { mutate: create, isPending } = useCreateUser()

  function handleSubmit(values: FormValues) {
    create(
      {
        employeeCode: values.employeeCode,
        fullName:     values.fullName,
        phone:        values.phone,
        password:     values.password,
        roleId:       values.roleId,
        branchId:     values.branchId,
        ...(values.counterId    && { counterId:    values.counterId }),
        ...(values.email        && { email:        values.email }),
        ...(values.address      && { address:      values.address }),
        ...(values.dateOfBirth  && { dateOfBirth:  values.dateOfBirth }),
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-2xl"
        title={t('title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
              {isPending && <Spinner className="mr-2 h-4 w-4" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 py-2">

          {/* Mã nhân viên */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="employeeCode" className="text-sm font-medium">
              {t('employeeCode')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="employeeCode" className="h-9" placeholder="NV001" status={errors.employeeCode ? 'error' : undefined} {...form.register('employeeCode')} />
            <FieldError errors={[errors.employeeCode]} />
          </div>

          {/* Họ và tên */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName" className="text-sm font-medium">
              {t('fullName')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="fullName" className="h-9" placeholder={t("fullNamePlaceholder")} status={errors.fullName ? 'error' : undefined} {...form.register('fullName')} />
            <FieldError errors={[errors.fullName]} />
          </div>

          {/* Số điện thoại */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone" className="text-sm font-medium">
              {t('phone')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="phone" className="h-9" placeholder="020 xxxx xxxx" status={errors.phone ? 'error' : undefined} {...form.register('phone')} />
            <FieldError errors={[errors.phone]} />
          </div>

          {/* Mật khẩu */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              {t('password')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input id="password" type="password" className="h-9" status={errors.password ? 'error' : undefined} {...form.register('password')} />
            <FieldError errors={[errors.password]} />
          </div>

          {/* Chi nhánh */}
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
                  onChange={v => {
                    field.onChange(v ?? '')
                    form.setValue('counterId', '')
                  }}
                  placeholder={t('branchPlaceholder')}
                  options={branches.map(b => ({ value: b.id, label: b.name }))}
                  showSearch={{ filterOption: (input, opt) =>
                    (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                  }}
                  notFoundContent={t("notFound")}
                  className="w-full"
                  popupMatchSelectWidth={false}
                />
              )}
            />
            <FieldError errors={[errors.branchId]} />
          </div>

          {/* Vai trò */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {t('role')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Controller
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onChange={v => field.onChange(v ?? '')}
                  placeholder={t('rolePlaceholder')}
                  options={roles.map(r => ({ value: r.id, label: r.name }))}
                  notFoundContent={t("notFound")}
                  className="w-full"
                  popupMatchSelectWidth={false}
                />
              )}
            />
            <FieldError errors={[errors.roleId]} />
          </div>

          {/* Quầy */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium text-muted-foreground">
              {t('counter')}
            </Label>
            <Controller
              control={form.control}
              name="counterId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onChange={v => field.onChange(v ?? '')}
                  placeholder={t('counterPlaceholder')}
                  options={counters.filter(c => c.isActive).map(c => ({ value: c.id, label: c.counterName }))}
                  disabled={!branchId}
                  allowClear
                  notFoundContent={t("notFound")}
                  className="w-full"
                  popupMatchSelectWidth={false}
                />
              )}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
              {t('email')}
            </Label>
            <Input id="email" type="email" className="h-9" placeholder="example@email.com" status={errors.email ? 'error' : undefined} {...form.register('email')} />
            <FieldError errors={[errors.email]} />
          </div>

          {/* Địa chỉ — full width */}
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="address" className="text-sm font-medium text-muted-foreground">
              {t('address')}
            </Label>
            <Input id="address" className="h-9" {...form.register('address')} />
          </div>

          {/* Ngày sinh */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dateOfBirth" className="text-sm font-medium text-muted-foreground">
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
