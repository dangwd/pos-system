'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { useAssignCounter } from '@/hooks/useUsers'
import { useCounters } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter,
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
// submitRef is populated so the outer footer button can trigger submission.
function AssignCounterForm({
  user,
  submitRef,
}: {
  user: AdminUser
  submitRef: React.MutableRefObject<(() => string | null | undefined)>
}) {
  const t = useTranslations('admin.users.assignCounterDialog')
  const [counterId, setCounterId] = useState<string | null>(() => user.counterId)
  const { data: counters = [] } = useCounters(user.branchId)

  // undefined means "not ready", null means "clear counter"
  submitRef.current = () => counterId

  return (
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
  )
}

export function UserAssignCounterDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.assignCounterDialog')
  const { mutate: assignCounter, isPending } = useAssignCounter()
  const submitRef = useRef<() => string | null | undefined>(() => undefined)

  function handleSubmit() {
    if (!user) return
    const counterId = submitRef.current()
    if (counterId === undefined) return
    assignCounter(
      { id: user.id, dto: { counterId } },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={!!user} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        title={t('title', { name: user?.fullName ?? '' })}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        {user && (
          <AssignCounterForm
            key={user.id}
            user={user}
            submitRef={submitRef}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
