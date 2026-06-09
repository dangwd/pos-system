/**
 * useCart — Optimistic add-to-cart hook (Command Pattern layer)
 *
 * Lưu ý: Đường dẫn API /api/cart đã bị xóa (mock route cũ).
 * Hook này hiện chỉ cập nhật local store mà không gọi API.
 * Khi submit giao dịch, cart data được gửi lên qua useCheckout → TransactionRepository.
 */

import { useCallback } from 'react'
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'
import type { CartItem } from '@/types/cart'

export function useAddToCart() {
  const { addItemToActive } = useInvoiceTabStore()

  const add = useCallback((item: CartItem) => {
    addItemToActive(item)
  }, [addItemToActive])

  return { mutate: add, isPending: false }
}
