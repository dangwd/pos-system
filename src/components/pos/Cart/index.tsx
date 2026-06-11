/**
 * Cart — Compound Component (Compound Component Pattern)
 *
 * Root component giữ CartContext, sub-components đọc từ context.
 * State đến từ useActiveTab() → khi switch tab, Cart tự render lại
 * theo đúng tab đang active mà không cần prop drilling.
 *
 * Cách dùng:
 *   <Cart>
 *     {items.map(i => <Cart.Item key={i.productId} productId={i.productId} />)}
 *     <Cart.Footer />
 *   </Cart>
 */

'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useActiveTab } from '@/hooks/useActiveTab'
import { CartItem as CartItemComponent } from './CartItem'
import { CartFooter } from './CartFooter'
import type { CartItem } from '@/types/cart'

// ─── Context ──────────────────────────────────────────────────────────────────

interface CartContextValue {
  items: CartItem[]
  subtotal: number
  total: number
  /** Số tiền giảm giá tuyệt đối (đã tính từ coupon %) */
  discountAmount: number
  couponCode: string | null
  note: string
  /** Các action thao tác lên cart của active tab */
  actions: {
    addItem: ReturnType<typeof useActiveTab>['addItem']
    removeItem: ReturnType<typeof useActiveTab>['removeItem']
    deleteItem: ReturnType<typeof useActiveTab>['deleteItem']
    setQty: ReturnType<typeof useActiveTab>['setQty']
  }
}

const CartContext = createContext<CartContextValue | null>(null)

/** Dùng bên trong Cart compound — throw nếu dùng ngoài <Cart> */
export function useCartContext() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCartContext must be used inside <Cart>')
  return ctx
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function CartRoot({ children }: { children: ReactNode }) {
  // Toàn bộ state đến từ active tab — switch tab → context value thay đổi
  const { tab, subtotal, total, addItem, removeItem, deleteItem, setQty } = useActiveTab()

  return (
    <CartContext.Provider
      value={{
        items: tab?.items ?? [],
        subtotal,
        total,
        discountAmount: tab?.discountAmount ?? 0,
        couponCode: tab?.couponCode ?? null,
        note: tab?.note ?? '',
        actions: { addItem, removeItem, deleteItem, setQty },
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// ─── Attach sub-components ────────────────────────────────────────────────────

CartRoot.Item = CartItemComponent
CartRoot.Footer = CartFooter

export { CartRoot as Cart }
