'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Select } from 'antd'
import { useCreateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { LoyaltyTier } from '@/types/customer'

const LOYALTY_TIERS: LoyaltyTier[] = ['silver', 'gold', 'platinum']

const EMPTY_FORM = {
  name: '',
  phoneNumber: '',
  email: '',
  address: '',
  dateOfBirth: '',
  loyaltyTier: '' as LoyaltyTier | '',
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CustomerCreateDialog({ open, onClose }: Props) {
  const t = useTranslations('admin.customers.createDialog')
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [showOptional, setShowOptional] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { mutate: create, isPending } = useCreateCustomer()

  const disabled = !form.name.trim()

  function handleSubmit() {
    const dto = {
      name: form.name.trim(),
      ...(form.phoneNumber && { phoneNumber: form.phoneNumber }),
      ...(form.email && { email: form.email }),
      ...(form.address && { address: form.address }),
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
      ...(form.loyaltyTier && { loyaltyTier: form.loyaltyTier as LoyaltyTier }),
    }
    create(dto, {
      onSuccess: () => {
        setForm({ ...EMPTY_FORM })
        setShowOptional(false)
        onClose()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        title={t('title')}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={disabled || isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        }
      >
        <FieldGroup className="py-1 gap-3">
          <Field>
            <FieldLabel htmlFor="cc-name">{t('name')}</FieldLabel>
            <Input
              id="cc-name"
              className="h-9"
              placeholder={t('namePlaceholder')}
              value={form.name}
              onChange={set('name')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="cc-phone">{t('phone')}</FieldLabel>
            <Input
              id="cc-phone"
              className="h-9"
              placeholder={t('phonePlaceholder')}
              value={form.phoneNumber}
              onChange={set('phoneNumber')}
            />
          </Field>

          <Field>
            <FieldLabel>{t('loyaltyTier')}</FieldLabel>
            <Select
              value={form.loyaltyTier || undefined}
              onChange={v => setForm(f => ({ ...f, loyaltyTier: (v ?? '') as LoyaltyTier | '' }))}
              options={LOYALTY_TIERS.map(tier => ({ value: tier, label: tier }))}
              allowClear
              className="w-full"
              popupMatchSelectWidth={false}
            />
          </Field>

          <button
            type="button"
            onClick={() => setShowOptional(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors -mb-1"
          >
            {showOptional ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t('optionalSection')}
          </button>

          {showOptional && (
            <>
              <Field>
                <FieldLabel htmlFor="cc-email">{t('email')}</FieldLabel>
                <Input
                  id="cc-email"
                  type="email"
                  className="h-9"
                  placeholder={t('emailPlaceholder')}
                  value={form.email}
                  onChange={set('email')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cc-address">{t('address')}</FieldLabel>
                <Input
                  id="cc-address"
                  className="h-9"
                  value={form.address}
                  onChange={set('address')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="cc-dob">{t('dateOfBirth')}</FieldLabel>
                <Input
                  id="cc-dob"
                  type="date"
                  className="h-9"
                  value={form.dateOfBirth}
                  onChange={set('dateOfBirth')}
                />
              </Field>
            </>
          )}
        </FieldGroup>

      </DialogContent>
    </Dialog>
  )
}
