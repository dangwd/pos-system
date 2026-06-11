'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { useAssignCounter } from '@/hooks/useUsers'
import { useCounters } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

// Keyed inner component — remounts when `user` changes so counterId state
// always initializes from the current entity without a useEffect.
function AssignCounterForm({
  user,
  isPending,
  onCancel,
  onSubmit,
}: {
  user: AdminUser
  isPending: boolean
  onCancel: () => void
  onSubmit: (counterId: string | null) => void
}) {
  const t = useTranslations('admin.users.assignCounterDialog')
  const [counterId, setCounterId] = useState<string | null>(() => user.counterId)
  const { data: counters = [] } = useCounters(user.branchId)

  return (
    <>
      <FieldGroup className="py-1">
        <Field>
          <FieldLabel>{t('counter')}</FieldLabel>
          <Select
            value={counterId || undefined}
            onChange={v => setCounterId(v ?? null)}
            placeholder={t('counterPlaceholder')}
            options={counters.filter(c => c.isActive).map(c => ({ value: c.id, label: c.counterName }))}
            allowClear
            notFoundContent="Không tìm thấy"
            className="w-full"
            popupMatchSelectWidth={false}
          />
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          {t('cancel')}
        </Button>
        <Button onClick={() => onSubmit(counterId)} disabled={isPending}>
          {isPending && <Spinner className="mr-2" />}
          {t('submit')}
        </Button>
      </DialogFooter>
    </>
  )
}

export function UserAssignCounterDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.assignCounterDialog')
  const { mutate: assignCounter, isPending } = useAssignCounter()

  function handleSubmit(counterId: string | null) {
    if (!user) return
    assignCounter(
      { id: user.id, dto: { counterId } },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('title', { name: user?.fullName ?? '' })}</DialogTitle>
        </DialogHeader>
        {user && (
          <AssignCounterForm
            key={user.id}
            user={user}
            isPending={isPending}
            onCancel={onClose}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
