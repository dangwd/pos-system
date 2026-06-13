'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { useResetPassword } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import type { AdminUser } from '@/types/admin-user'

const schema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
})

type FormValues = z.infer<typeof schema>

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export function UserResetPasswordDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.resetPasswordDialog')
  const [show, setShow] = useState(false)
  const { mutate: resetPassword, isPending } = useResetPassword()

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '' },
  })
  const { errors } = form.formState

  useEffect(() => {
    if (!user) {
      form.reset({ newPassword: '' })
      setShow(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function handleSubmit(values: FormValues) {
    resetPassword(
      { id: user!.id, dto: { newPassword: values.newPassword } },
      { onSuccess: onClose },
    )
  }

  function handleClose() {
    form.reset({ newPassword: '' })
    onClose()
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={t('title', { name: user?.fullName ?? '' })}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={form.handleSubmit(handleSubmit)} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <div className="flex flex-col gap-1.5 py-1">
          <Label htmlFor="new-password" className="text-sm font-medium">
            {t('newPassword')} <span className="text-destructive ml-0.5">*</span>
          </Label>
          <InputGroup>
            <InputGroupInput
              id="new-password"
              type={show ? 'text' : 'password'}
              className="h-9"
              status={errors.newPassword ? 'error' : undefined}
              {...form.register('newPassword')}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={() => setShow(v => !v)} tabIndex={-1}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError errors={[errors.newPassword]} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
