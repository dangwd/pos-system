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
import { useTranslations } from 'next-intl'
import type { Transaction } from '@/types/transaction'

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
      const result = await pos.checkout({
        type: pos.txnType,
        customerId: undefined,
        note: pos.note || undefined,
      })
      // Đóng modal và reset tab sau bất kỳ thanh toán thành công nào
      setPaymentOpen(false)
      pos.resetTabStatus()
      // Hiển thị biên lai nếu hoàn tất
      if (result?.status === 'Completed') {
        setReceiptTransaction(result)
      }
      // Toast được hiển thị từ useCheckout onSuccess — không gọi lại ở đây
    } catch {
      // Toast lỗi được hiển thị từ useCheckout onError
      // Giữ modal mở để người dùng thử lại
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
