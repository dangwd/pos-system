'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { useResetPassword } from '@/hooks/useUsers'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export function UserResetPasswordDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.resetPasswordDialog')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  const { mutate: resetPassword, isPending } = useResetPassword()

  function handleClose() {
    setPassword('')
    onClose()
  }

  function handleSubmit() {
    resetPassword({ id: user!.id, dto: { newPassword: password } }, {
      onSuccess: () => {
        setPassword('')
        onClose()
      },
    })
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        title={t('title', { name: user?.fullName ?? '' })}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!password || isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <Field className="py-1">
          <FieldLabel htmlFor="new-password">{t('newPassword')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="new-password"
              type={show ? 'text' : 'password'}
              className="h-9"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={() => setShow(v => !v)} tabIndex={-1}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </Field>

      </DialogContent>
    </Dialog>
  )
}
