'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Select, DatePicker } from 'antd'
import dayjs from 'dayjs'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
import {
  useUpdateUser, useUpdateUserRole, useAssignCounter, useRoles,
} from '@/hooks/useUsers'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { AdminUser } from '@/types/admin-user'

const schema = z.object({
  fullName:    z.string().min(1, 'Vui lòng nhập họ và tên'),
  phone:       z.string().min(1, 'Vui lòng nhập số điện thoại'),
  branchId:    z.string().min(1, 'Vui lòng chọn chi nhánh'),
  roleId:      z.string().min(1, 'Vui lòng chọn vai trò'),
  counterId:   z.string().nullable().optional(),
  email:       z.string().refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Email không hợp lệ',
  ),
  address:     z.string().optional(),
  dateOfBirth: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  user: AdminUser
  onCancel: () => void
  onSaved: () => void
}

function FormRow({ label, required, children, error }: {
  label: string; required?: boolean; children: React.ReactNode; error?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <FieldError errors={[{ message: error }]} />}
    </div>
  )
}

export function UserInlineEditForm({ user, onCancel, onSaved }: Props) {
  const t  = useTranslations('admin.users.editInfoDialog')
  const tc = useTranslations('admin.users.columns')

  const { data: branches = [] } = useBranches()
  const { data: roles = [] }    = useRoles()

  const { mutateAsync: updateUser,     isPending: savingInfo }    = useUpdateUser()
  const { mutateAsync: updateUserRole, isPending: savingRole }    = useUpdateUserRole()
  const { mutateAsync: assignCounter,  isPending: savingCounter } = useAssignCounter()
  const isPending = savingInfo || savingRole || savingCounter

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName:    user.fullName,
      phone:       user.phone,
      branchId:    user.branchId,
      roleId:      user.role.id,
      counterId:   user.counterId,
      email:       user.email ?? '',
      address:     user.address ?? '',
      dateOfBirth: user.dateOfBirth ?? '',
    },
  })
  const { errors } = form.formState

  const branchId = form.watch('branchId')
  const { data: counters = [] } = useCounters(branchId)

  async function handleSave(values: FormValues) {
    const infoChanged =
      values.fullName !== user.fullName ||
      values.phone !== user.phone ||
      values.branchId !== user.branchId ||
      (values.email || '') !== (user.email ?? '') ||
      (values.address || '') !== (user.address ?? '') ||
      (values.dateOfBirth || '') !== (user.dateOfBirth ?? '')

    const roleChanged    = values.roleId !== user.role.id
    const counterChanged = (values.counterId ?? null) !== user.counterId

    try {
      if (infoChanged) {
        await updateUser({
          id: user.id,
          dto: {
            fullName:  values.fullName,
            phone:     values.phone,
            branchId:  values.branchId,
            ...(values.email       && { email:       values.email }),
            ...(values.address     && { address:     values.address }),
            ...(values.dateOfBirth && { dateOfBirth: values.dateOfBirth }),
          },
        })
      }
      if (roleChanged)    await updateUserRole({ id: user.id, dto: { roleId: values.roleId } })
      if (counterChanged) await assignCounter({ id: user.id, dto: { counterId: values.counterId ?? null } })
      onSaved()
    } catch {
      // Lỗi đã được toast trong các hook mutation
    }
  }

  return (
    <div style={{ padding: '12px 16px 4px 48px', background: '#f8faff' }}>
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap', paddingBottom: 8 }}>
        <div className="flex flex-col gap-3" style={{ flex: 1, minWidth: 280 }}>
          <FormRow label={t('fullName')} required error={errors.fullName?.message}>
            <Controller control={form.control} name="fullName" render={({ field }) => (
              <Input className="h-9" status={errors.fullName ? 'error' : undefined}
                value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
            )} />
          </FormRow>

          <FormRow label={t('phone')} required error={errors.phone?.message}>
            <Controller control={form.control} name="phone" render={({ field }) => (
              <Input className="h-9" status={errors.phone ? 'error' : undefined}
                value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
            )} />
          </FormRow>

          <FormRow label={t('email')} error={errors.email?.message}>
            <Controller control={form.control} name="email" render={({ field }) => (
              <Input className="h-9" type="email" placeholder="example@email.com"
                status={errors.email ? 'error' : undefined}
                value={field.value} onChange={field.onChange} onBlur={field.onBlur} name={field.name} />
            )} />
          </FormRow>

          <FormRow label={t('address')}>
            <Controller control={form.control} name="address" render={({ field }) => (
              <Input className="h-9" value={field.value} onChange={field.onChange}
                onBlur={field.onBlur} name={field.name} />
            )} />
          </FormRow>

          <FormRow label={t('dateOfBirth')}>
            <Controller control={form.control} name="dateOfBirth" render={({ field }) => (
              <DatePicker className="w-full h-9" format="DD/MM/YYYY" placeholder="DD/MM/YYYY" allowClear
                value={field.value ? dayjs(field.value) : null}
                onChange={d => field.onChange(d ? d.format('YYYY-MM-DD') : '')} />
            )} />
          </FormRow>
        </div>

        <div className="flex flex-col gap-3" style={{ flex: 1, minWidth: 280 }}>
          <FormRow label={tc('role')} required error={errors.roleId?.message}>
            <Controller control={form.control} name="roleId" render={({ field }) => (
              <Select className="w-full" value={field.value || undefined}
                onChange={v => field.onChange(v ?? '')}
                options={roles.map(r => ({ value: r.id, label: r.name }))}
                notFoundContent="Không tìm thấy" popupMatchSelectWidth={false} />
            )} />
          </FormRow>

          <FormRow label={t('branch')} required error={errors.branchId?.message}>
            <Controller control={form.control} name="branchId" render={({ field }) => (
              <Select className="w-full" value={field.value || undefined}
                placeholder={t('branchPlaceholder')}
                onChange={v => { field.onChange(v ?? ''); form.setValue('counterId', null) }}
                options={branches.map(b => ({ value: b.id, label: b.name }))}
                showSearch optionFilterProp="label"
                notFoundContent="Không tìm thấy" popupMatchSelectWidth={false} />
            )} />
          </FormRow>

          <FormRow label={tc('counter')}>
            <Controller control={form.control} name="counterId" render={({ field }) => (
              <Select className="w-full" value={field.value || undefined}
                placeholder={t('counterPlaceholder')}
                onChange={v => field.onChange(v ?? null)} allowClear
                options={counters.filter(c => c.isActive).map(c => ({ value: c.id, label: c.counterName }))}
                notFoundContent="Không tìm thấy" popupMatchSelectWidth={false} />
            )} />
          </FormRow>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 8, alignItems: 'center',
        padding: '12px 0', borderTop: '1px solid #e5e7eb',
      }}>
        <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={isPending}>
          {isPending ? <Spinner className="mr-2" /> : <CheckOutlined className="mr-1" />}
          {t('submit')}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
          <CloseOutlined className="mr-1" />
          {t('cancel')}
        </Button>
      </div>
    </div>
  )
}
