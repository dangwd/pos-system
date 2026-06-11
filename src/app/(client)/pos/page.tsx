/**
 * POS Page — Màn hình bán hàng chính
 *
 * Component này chỉ orchestrate — không chứa business logic.
 * Mọi state đến từ usePos() facade (R-ARCH-5).
 */

'use client'

import { useState } from 'react'
import { usePos } from '@/hooks/usePos'
import { PosTopBar } from '@/components/pos/PosTopBar'
import { TransactionTable } from '@/components/pos/TransactionTable'
import { PaymentPanel } from '@/components/pos/PaymentPanel'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { Receipt } from '@/components/pos/Receipt'
import { toast } from 'sonner'
import type { Transaction } from '@/types/transaction'
import { useTranslations } from 'next-intl'

export default function PosPage() {
  const t = useTranslations('pos.errors')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null)

  const pos = usePos()

  // ── Payment modal lifecycle ─────────────────────────────────────────────────

  const handleOpenPayment = () => {
    if (pos.cartItems.length === 0) {
      toast.error(t('emptyCart'))
      return
    }
    pos.setTabPaying()
    setPaymentOpen(true)
  }

  const handleClosePayment = () => {
    pos.resetTabStatus()
    setPaymentOpen(false)
  }

  const handleCheckout = async () => {
    try {
      // TODO: ดึง branchId/counterId จาก session user จริง เมื่อ auth context พร้อม
      const result = await pos.checkout({
        type: 'SellGold',
        branchId: 'branch-placeholder',
        staffId: 'staff-placeholder',
        counterId: 'counter-placeholder',
        customerId: undefined,
        note: pos.note || undefined,
      })
      if (result?.status === 'Completed') {
        setReceiptTransaction(result)
        setPaymentOpen(false)
        pos.resetTabStatus()
        toast.success(t('checkoutSuccess'))
      } else if (result?.status === 'Pending') {
        setPaymentOpen(false)
        pos.resetTabStatus()
        toast.info(t('pendingApproval'))
      }
    } catch {
      toast.error(t('checkoutFailed'))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full overflow-hidden">

      <PosTopBar onAddProduct={pos.addToCart} />

      <div className="flex flex-1 min-h-0 overflow-hidden">

        <TransactionTable />

        <PaymentPanel
          subtotal={pos.subtotal}
          total={pos.total}
          discount={pos.discount}
          isCheckingOut={pos.isCheckingOut}
          cartEmpty={pos.cartItems.length === 0}
          onOpenPayment={handleOpenPayment}
          onApplyDiscount={pos.applyDiscount}
          onClearDiscount={pos.clearDiscount}
        />
      </div>

      <PaymentModal
        open={paymentOpen}
        onClose={handleClosePayment}
        total={pos.total}
        subtotal={pos.subtotal}
        discount={pos.discount}
        paymentMethod={pos.paymentMethod}
        onPaymentMethodChange={pos.setPaymentMethod}
        onCheckout={handleCheckout}
        isCheckingOut={pos.isCheckingOut}
        onApplyDiscount={pos.applyDiscount}
        onClearDiscount={pos.clearDiscount}
        discountAmount={pos.discount}
      />

      <Receipt
        open={!!receiptTransaction}
        transaction={receiptTransaction}
        onClose={() => setReceiptTransaction(null)}
      />
    </div>
  )
}
