'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Select } from 'antd'
import { useUpdateCustomer } from '@/hooks/useCustomers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import type { Customer, LoyaltyTier } from '@/types/customer'

const LOYALTY_TIERS: LoyaltyTier[] = ['silver', 'gold', 'platinum']

interface Props {
  customer: Customer | null
  onClose: () => void
}

type FormData = {
  name: string
  phoneNumber: string
  email: string
  address: string
  dateOfBirth: string
  loyaltyTier: LoyaltyTier | ''
}

// Keyed inner component — remounts when `customer` changes so form state
// always initializes from the current entity without a useEffect.
// submitRef is populated so the outer footer button can trigger submission.
function CustomerFormBody({
  customer,
  submitRef,
}: {
  customer: Customer
  submitRef: React.MutableRefObject<(() => FormData | null)>
}) {
  const tCreate = useTranslations('admin.customers.createDialog')

  const [form, setForm] = useState<FormData>(() => ({
    name: customer.name,
    phoneNumber: customer.phoneNumber ?? '',
    email: customer.email ?? '',
    address: '',
    dateOfBirth: '',
    loyaltyTier: customer.loyaltyTier ?? '',
  }))

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // Expose current form data to the outer footer button
  submitRef.current = () => form.name.trim() ? form : null

  return (
    <FieldGroup className="py-1 gap-3">
      <Field>
        <FieldLabel htmlFor="ce-name">{tCreate('name')}</FieldLabel>
        <Input id="ce-name" className="h-9" value={form.name} onChange={set('name')} />
      </Field>

      <Field>
        <FieldLabel htmlFor="ce-phone">{tCreate('phone')}</FieldLabel>
        <Input
          id="ce-phone"
          className="h-9"
          placeholder={tCreate('phonePlaceholder')}
          value={form.phoneNumber}
          onChange={set('phoneNumber')}
        />
      </Field>

      <Field>
        <FieldLabel>{tCreate('loyaltyTier')}</FieldLabel>
        <Select
          value={form.loyaltyTier || undefined}
          onChange={v => setForm(f => ({ ...f, loyaltyTier: (v ?? '') as LoyaltyTier | '' }))}
          options={LOYALTY_TIERS.map(tier => ({ value: tier, label: tier }))}
          allowClear
          className="w-full"
          popupMatchSelectWidth={false}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="ce-email">{tCreate('email')}</FieldLabel>
        <Input
          id="ce-email"
          type="email"
          className="h-9"
          placeholder={tCreate('emailPlaceholder')}
          value={form.email}
          onChange={set('email')}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="ce-address">{tCreate('address')}</FieldLabel>
        <Input id="ce-address" className="h-9" value={form.address} onChange={set('address')} />
      </Field>

      <Field>
        <FieldLabel htmlFor="ce-dob">{tCreate('dateOfBirth')}</FieldLabel>
        <Input
          id="ce-dob"
          type="date"
          className="h-9"
          value={form.dateOfBirth}
          onChange={set('dateOfBirth')}
        />
      </Field>
    </FieldGroup>
  )
}

export function CustomerEditDialog({ customer, onClose }: Props) {
  const t = useTranslations('admin.customers')
  const { mutate: update, isPending } = useUpdateCustomer()
  const submitRef = useRef<() => FormData | null>(() => null)

  function handleSubmit() {
    if (!customer) return
    const form = submitRef.current()
    if (!form) return
    const dto = {
      name: form.name.trim(),
      ...(form.phoneNumber && { phoneNumber: form.phoneNumber }),
      ...(form.email && { email: form.email }),
      ...(form.address && { address: form.address }),
      ...(form.dateOfBirth && { dateOfBirth: form.dateOfBirth }),
      ...(form.loyaltyTier && { loyaltyTier: form.loyaltyTier as LoyaltyTier }),
    }
    update({ id: customer.id, dto }, { onSuccess: onClose })
  }

  return (
    <Dialog open={!!customer} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        title={t('editDialog.title', { name: customer?.name ?? '' })}
        footer={
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              {t('editDialog.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <Spinner className="mr-2" />}
              {t('editDialog.submit')}
            </Button>
          </DialogFooter>
        }
      >
        {customer && (
          <CustomerFormBody
            key={customer.id}
            customer={customer}
            submitRef={submitRef}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
