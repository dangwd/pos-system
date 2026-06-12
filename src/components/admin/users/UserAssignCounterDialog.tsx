'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAssignCounter } from '@/hooks/useUsers'
import { useCounters } from '@/hooks/useBranches'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput,
  ComboboxItem, ComboboxList,
} from '@/components/ui/combobox'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { AdminUser } from '@/types/admin-user'

interface Props {
  user: AdminUser | null
  onClose: () => void
}

export function UserAssignCounterDialog({ user, onClose }: Props) {
  const t = useTranslations('admin.users.assignCounterDialog')
  const [counterId, setCounterId] = useState<string | null>(null)

  useEffect(() => {
    if (user) setCounterId(user.counterId)
  }, [user])

  const { data: counters = [] } = useCounters(user?.branchId ?? null)
  const { mutate: assignCounter, isPending } = useAssignCounter()

  function handleSubmit() {
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

        <FieldGroup className="py-1">
          <Field>
            <FieldLabel>{t('counter')}</FieldLabel>
            <Combobox
              value={counterId ?? ''}
              onValueChange={v => setCounterId(v || null)}
            >
              <ComboboxInput
                placeholder={t('counterPlaceholder')}
                className="h-9 w-full"
              />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxItem value="">{t('unassign')}</ComboboxItem>
                  {counters.filter(c => c.isActive).map(c => (
                    <ComboboxItem key={c.id} value={c.id}>{c.counterName}</ComboboxItem>
                  ))}
                </ComboboxList>
                <ComboboxEmpty>—</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Spinner className="mr-2" />}
            {t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
