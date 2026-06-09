/**
 * PaymentPanel — Panel thanh toán bên phải màn hình POS
 *
 * Cấu trúc:
 *  1. StoreHeader       — tên cửa hàng / chi nhánh
 *  2. OrderLookup       — tra cứu hóa đơn cũ (F6)
 *  3. CustomerSection   — gắn khách hàng (F4)
 *  4. PaymentBreakdown  — chi tiết: tổng, giảm, tiền thực thu
 *  5. CheckoutButton    — mở PaymentModal
 */

'use client'

import { useState } from 'react'
import { useActiveTab } from '@/hooks/useActiveTab'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreditCard, Search, Plus, ScanLine, X, User, Receipt, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatKip(n: number) {
  return n.toLocaleString('lo-LA') + ' ₭'
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-1.5">
      <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        {children}
      </p>
      {action}
    </div>
  )
}

// ─── 1. StoreHeader ───────────────────────────────────────────────────────────

function StoreHeader() {
  const t = useTranslations('pos.payment.panel')
  return (
    <div className="px-4 py-3.5 bg-primary text-primary-foreground shrink-0">
      <p className="text-xs font-extrabold tracking-wide uppercase text-center leading-snug">
        {t('storeName')}
      </p>
      <p className="text-[10px] mt-0.5 opacity-60 tracking-widest text-center uppercase">
        {t('storeAddress')}
      </p>
    </div>
  )
}

// ─── 2. OrderLookup ───────────────────────────────────────────────────────────

function OrderLookup() {
  const t = useTranslations('pos.payment.panel')
  const [code, setCode] = useState('')

  return (
    <div className="px-4 py-3 shrink-0">
      <SectionLabel
        action={
          <button className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
            <Receipt className="h-2.5 w-2.5" />
            {t('reprint')}
          </button>
        }
      >
        {t('lookupLabel')}
      </SectionLabel>
      <div className="flex gap-1.5">
        <Input
          placeholder={t('lookupPlaceholder')}
          value={code}
          onChange={e => setCode(e.target.value)}
          className="h-8 text-xs flex-1"
        />
        <button className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border bg-muted hover:bg-accent transition-colors">
          <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// ─── 3. CustomerSection ───────────────────────────────────────────────────────

function CustomerSection() {
  const t = useTranslations('pos.payment.panel')
  const { tab, clearCustomer } = useActiveTab()
  const [query, setQuery] = useState('')

  return (
    <div className="px-4 py-3 shrink-0">
      <SectionLabel>{t('customerLabel')}</SectionLabel>

      {tab?.customerName ? (
        <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{tab.customerName}</p>
            <p className="text-[10px] text-muted-foreground font-mono">{tab.customerId}</p>
          </div>
          <button
            onClick={clearCustomer}
            className="shrink-0 p-1 rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={t('customerSearch')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="h-8 text-xs pl-7"
            />
          </div>
          <button className="h-8 w-8 shrink-0 flex items-center justify-center rounded-md border bg-muted hover:bg-accent transition-colors">
            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── 4. PaymentBreakdown ──────────────────────────────────────────────────────

interface PaymentBreakdownProps {
  subtotal: number
  discount: number
  total: number
  onApplyDiscount: (discountAmount: number) => void
  onClearDiscount: () => void
}

function PaymentBreakdown({
  subtotal, discount, total,
  onApplyDiscount, onClearDiscount,
}: PaymentBreakdownProps) {
  const t = useTranslations('pos.payment.panel')
  const [discountInput, setDiscountInput] = useState('')

  const handleApply = () => {
    const amount = parseInt(discountInput.replace(/\D/g, ''), 10)
    if (!isNaN(amount) && amount > 0) {
      onApplyDiscount(amount)
      setDiscountInput('')
    }
  }

  return (
    <div className="px-4 py-3 flex-1 flex flex-col gap-3">

      <div className="space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t('subtotalLabel')}</span>
          <span className="text-xs font-medium tabular-nums">{formatKip(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{t('discountLabel')}</span>
          <span className={`text-xs font-medium tabular-nums ${discount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            -{formatKip(discount)}
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-border/60" />

      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
          {t('discountLabel')}
        </p>
        {discount > 0 ? (
          <div className="flex items-center justify-between bg-secondary rounded-md px-3 py-2 border border-border">
            <span className="text-xs font-semibold tabular-nums">-{formatKip(discount)}</span>
            <button onClick={onClearDiscount} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <Input
              placeholder={t('discountInput')}
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleApply()}
              className="h-8 text-xs flex-1"
              type="number"
              min={0}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleApply}
              disabled={!discountInput.trim()}
              className="h-8 text-xs px-3 shrink-0"
            >
              {t('applyDiscount')}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-border" />

      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">{t('balance')}</span>
        <span className="text-sm font-semibold tabular-nums">{formatKip(total)}</span>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1">
          {t('totalDue')}
        </p>
        <p className="text-3xl font-black tabular-nums text-foreground tracking-tight leading-none">
          {total.toLocaleString('lo-LA')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{t('currency')}</p>
      </div>
    </div>
  )
}

// ─── PaymentPanel Root ────────────────────────────────────────────────────────

export interface PaymentPanelProps {
  subtotal: number
  total: number
  discount: number
  isCheckingOut: boolean
  cartEmpty: boolean
  onOpenPayment: () => void
  onApplyDiscount: (discountAmount: number) => void
  onClearDiscount: () => void
}

export function PaymentPanel({
  subtotal, total, discount,
  isCheckingOut, cartEmpty,
  onOpenPayment, onApplyDiscount, onClearDiscount,
}: PaymentPanelProps) {
  const t = useTranslations('pos.payment.panel')

  return (
    <aside className="flex flex-col w-72 lg:w-80 shrink-0 border-l bg-card overflow-y-auto">

      <StoreHeader />
      <OrderLookup />

      <div className="mx-4 border-t border-dashed border-border/50" />

      <CustomerSection />

      <div className="mx-4 border-t border-border/50" />

      <PaymentBreakdown
        subtotal={subtotal}
        discount={discount}
        total={total}
        onApplyDiscount={onApplyDiscount}
        onClearDiscount={onClearDiscount}
      />

      <div className="px-4 pb-4 pt-2 shrink-0">
        <Button
          className="w-full h-11 font-bold text-sm gap-2"
          disabled={cartEmpty || isCheckingOut}
          onClick={onOpenPayment}
        >
          {isCheckingOut ? (
            <><Loader2 className="h-4 w-4 animate-spin" />{t('processing')}</>
          ) : (
            <><CreditCard className="h-4 w-4" />{t('checkout')}</>
          )}
        </Button>
      </div>
    </aside>
  )
}
