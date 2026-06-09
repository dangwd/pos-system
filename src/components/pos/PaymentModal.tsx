'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { PAYMENT_METHOD_KEYS, type PaymentMethodKey } from '@/lib/strategies/payment.strategy'
import { Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

function formatKip(amount: number) {
  return amount.toLocaleString('lo-LA') + ' ₭'
}

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  total: number
  subtotal: number
  discount: number
  discountAmount: number
  paymentMethod: PaymentMethodKey
  onPaymentMethodChange: (m: PaymentMethodKey) => void
  onCheckout: () => void
  isCheckingOut: boolean
  onApplyDiscount: (discountAmount: number) => void
  onClearDiscount: () => void
}

export function PaymentModal({
  open, onClose, total, subtotal, discount, discountAmount,
  paymentMethod, onPaymentMethodChange, onCheckout,
  isCheckingOut, onApplyDiscount, onClearDiscount,
}: PaymentModalProps) {
  const t = useTranslations('pos.payment.modal')
  const tMethods = useTranslations('pos.payment.methods')
  const [discountInput, setDiscountInput] = useState('')

  const handleApply = () => {
    const amount = parseInt(discountInput.replace(/\D/g, ''), 10)
    if (!isNaN(amount) && amount > 0) {
      onApplyDiscount(amount)
      setDiscountInput('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t('subtotal')}</span>
              <span>{formatKip(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-destructive">
                <span>{t('discount')}</span>
                <span>-{formatKip(discount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>{t('total')}</span>
              <span className="text-primary">{formatKip(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('discountLabel')}</Label>
            {discountAmount > 0 ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 bg-secondary">
                <span className="text-sm font-semibold tabular-nums">-{formatKip(discountAmount)}</span>
                <Button variant="ghost" size="sm" onClick={onClearDiscount} className="h-6 text-xs">
                  {t('clearDiscount')}
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder={t('discountPlaceholder')}
                  value={discountInput}
                  onChange={e => setDiscountInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApply()}
                  type="number"
                  min={0}
                />
                <Button onClick={handleApply} disabled={!discountInput.trim()} variant="outline">
                  {t('applyDiscount')}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('paymentMethod')}</Label>
            <Select value={paymentMethod} onValueChange={v => onPaymentMethodChange(v as PaymentMethodKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_KEYS.map(key => (
                  <SelectItem key={key} value={key}>{tMethods(key)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCheckingOut}>{t('cancel')}</Button>
          <Button onClick={onCheckout} disabled={isCheckingOut} className="min-w-32">
            {isCheckingOut
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t('processing')}</>
              : t('pay', { amount: formatKip(total) })
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
