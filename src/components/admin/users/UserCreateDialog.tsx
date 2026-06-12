'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { rolesRepository } from '@/lib/repositories/roles.repository'
import { useAuthStore } from '@/stores/auth.store'
import { useCreateUser } from '@/hooks/useUsers'
import { useBranches, useCounters } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY_FORM = {
  employeeCode: '',
  fullName: '',
  phone: '',
  password: '',
  roleId: '',
  branchId: '',
  counterId: '',
  email: '',
  address: '',
  dateOfBirth: '',
}

export function UserCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.users.createDialog')
  const defaultBranchId = useAuthStore(s => s.user?.branchId) ?? ''
  const [form, setForm] = useState({ ...EMPTY_FORM, branchId: defaultBranchId })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: branches = [] } = useBranches()
  const { data: counters = [] } = useCounters(form.branchId || null)

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesRepository.getList(),
    staleTime: 300_000,
    enabled: open,
  })

  const { mutate: create, isPending } = useCreateUser()

  const disabled =
    !form.employeeCode || !form.fullName || !form.phone ||
    !form.password || !form.roleId || !form.branchId

  function handleSubmit() {
    create(
      {
        employeeCode: form.employeeCode,
        fullName: form.fullName,
        phone: form.phone,
        password: form.password,
        roleId: form.roleId,
        branchId: form.branchId,
        ...(form.counterId && { counterId: form.counterId }),
        ...(form.email && { email: form.email }),
        ...(form.address && { address: form.address }),
        ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
      },
      {
        onSuccess: () => {
          setForm({ ...EMPTY_FORM, branchId: defaultBranchId })
          onClose()
        },
      },
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
            <Button onClick={handleSubmit} disabled={disabled || isPending}>
              {isPending && <Spinner className="mr-2 h-4 w-4" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="grid grid-cols-2 gap-x-5 gap-y-5 py-2">

          {/* Mã nhân viên */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="employeeCode" className="text-sm font-medium">
              {t('employeeCode')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="employeeCode"
              className="h-9"
              placeholder="NV001"
              value={form.employeeCode}
              onChange={set('employeeCode')}
            />
          </div>

          {/* Họ và tên */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              {t('fullName')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="fullName"
              className="h-9"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={set('fullName')}
            />
          </div>

          {/* Số điện thoại */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              {t('phone')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="phone"
              className="h-9"
              placeholder="020 xxxx xxxx"
              value={form.phone}
              onChange={set('phone')}
            />
          </div>

          {/* Mật khẩu */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {t('password')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              className="h-9"
              value={form.password}
              onChange={set('password')}
            />
          </div>

          {/* Chi nhánh */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">
              {t('branch')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={form.branchId || undefined}
              onChange={v => v && setForm(f => ({ ...f, branchId: v, counterId: '' }))}
              placeholder={t('branchPlaceholder')}
              options={branches.map(b => ({ value: b.id, label: b.name }))}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent="Không tìm thấy"
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </div>

          {/* Vai trò */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">
              {t('role')} <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={form.roleId || undefined}
              onChange={v => v && setForm(f => ({ ...f, roleId: v }))}
              placeholder={t('rolePlaceholder')}
              options={roles.map(r => ({ value: r.id, label: r.name }))}
              notFoundContent="Không tìm thấy"
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </div>

          {/* Quầy */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-muted-foreground">
              {t('counter')}
            </Label>
            <Select
              value={form.counterId || undefined}
              onChange={v => setForm(f => ({ ...f, counterId: v ?? '' }))}
              placeholder={t('counterPlaceholder')}
              options={counters.filter(c => c.isActive).map(c => ({ value: c.id, label: c.counterName }))}
              disabled={!form.branchId}
              allowClear
              notFoundContent="Không tìm thấy"
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">
              {t('email')}
            </Label>
            <Input
              id="email"
              type="email"
              className="h-9"
              placeholder="example@email.com"
              value={form.email}
              onChange={set('email')}
            />
          </div>

          {/* Địa chỉ — full width */}
          <div className="col-span-2 flex flex-col gap-2">
            <Label htmlFor="address" className="text-sm font-medium text-muted-foreground">
              {t('address')}
            </Label>
            <Input
              id="address"
              className="h-9"
              value={form.address}
              onChange={set('address')}
            />
          </div>

          {/* Ngày sinh */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="dateOfBirth" className="text-sm font-medium text-muted-foreground">
              {t('dateOfBirth')}
            </Label>
            <Input
              id="dateOfBirth"
              type="date"
              className="h-9"
              value={form.dateOfBirth}
              onChange={set('dateOfBirth')}
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
