/**
 * usePos — Hook Facade (Entry point duy nhất cho POS page)
 *
 * Tổng hợp tất cả hooks con. Component chỉ gọi usePos(),
 * không cần biết bên trong có Repository, Strategy hay Store nào.
 *
 * Cart state được đọc từ useActiveTab() → tự động cập nhật khi switch tab.
 *
 * Luồng thêm sản phẩm vào giỏ:
 *   1. Load priceConfig từ GET /api/config/prices (cache 1 phút)
 *   2. Khi nhân viên chọn sản phẩm từ InventoryItem (có inventoryItemId)
 *   3. Build CartItem với unitPrice snapshot từ priceConfig tại thời điểm đó
 *   4. addItemToActive(cartItem)
 */

'use client'

import { useState } from 'react'
import { useActiveTab } from './useActiveTab'
import { useAddToCart } from './useAddToCart'
import { useCheckout } from './useCheckout'
import { useCoupon } from './useCoupon'
import { useActivePriceConfig } from './useConfig'
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'
import { CashStrategy, BankTransferStrategy, CombinedStrategy } from '@/lib/strategies'

import type { ProductWithStock } from '@/types/product'
import type { PaymentMethodKey } from '@/lib/strategies/payment.strategy'
import type { TransactionType } from '@/types/transaction'

// Khởi tạo strategies một lần ngoài hook (stateless objects)
const STRATEGIES = {
  'cash': new CashStrategy(),
  'bank-transfer': new BankTransferStrategy(),
  'combined': new CombinedStrategy(),
} as const

export function usePos() {
  // ── UI local state ──────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('cash')

  // ── Bảng giá đang áp dụng (active price table resolve theo JWT) ─────────────
  const { priceConfig, priceTableId, errorCode: priceErrorCode } = useActivePriceConfig()

  // ── Active tab state (cart, giảm giá, v.v.) ─────────────────────────────────
  const {
    tab,
    subtotal,
    total,
    totalQty,
    clearCart,
  } = useActiveTab()

  const { addToCartAs } = useAddToCart(priceConfig)

  const { updateTab } = useInvoiceTabStore()
  const { applyAmount: applyDiscount, clear: clearDiscount } = useCoupon()

  // ── Checkout (Strategy Pattern) ─────────────────────────────────────────────
  const strategy = STRATEGIES[paymentMethod]
  const { mutateAsync: checkoutMutate, isPending: isCheckingOut, data: lastTransaction } =
    useCheckout(strategy)

  // ── Actions ─────────────────────────────────────────────────────────────────

  const addToCart = (product: ProductWithStock) => addToCartAs(product, 'Normal')

  const checkout = (params: {
    type: TransactionType
    customerId: string
    note?: string
    cashAmount?: number
    bankAmount?: number
    referenceInvoiceCode?: string
  }) => checkoutMutate({ ...params, priceTableId })

  const setTabPaying = () => {
    if (tab) updateTab(tab.id, { status: 'paying' })
  }

  const resetTabStatus = () => {
    if (tab) updateTab(tab.id, { status: 'draft' })
  }

  // ── Return API ──────────────────────────────────────────────────────────────
  return {
    // Price config
    priceConfig,
    priceTableId,
    priceErrorCode,

    // Active tab cart
    cartItems: tab?.items ?? [],
    subtotal,
    total,
    totalQty,
    discount: tab?.discountAmount ?? 0,
    note: tab?.note ?? '',
    txnType: tab?.txnType ?? 'SellGold',

    // Cart actions
    addToCart,
    clearCart,

    // Discount (giảm giá thủ công — không có coupon API)
    applyDiscount,
    clearDiscount,

    // Payment
    paymentMethod, setPaymentMethod,
    checkout,
    isCheckingOut,
    lastTransaction,

    // Tab
    customerId: tab?.customerId ?? null,

    // Tab status (cho payment modal lifecycle)
    setTabPaying,
    resetTabStatus,
  }
}
