/**
 * useActiveTab — Facade hook cho tab đang active
 *
 * Component (ProductGrid, Cart) chỉ cần gọi hook này để:
 *  - Đọc state của tab đang active (items, subtotal, total, ...)
 *  - Gọi các action thao tác lên active tab
 *
 * Khi switch tab → hook trả về data mới → component tự re-render.
 * Không cần prop drilling hay context thủ công.
 */

import { useMemo } from 'react'
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'
import { calcSubtotal, calcTotal } from '@/lib/pricing'

export function useActiveTab() {
  const {
    tabs,
    activeTabId,
    updateTab,
    addItemToActive,
    removeItemFromActive,
    deleteItemFromActive,
    setItemQtyInActive,
    clearActiveCart,
  } = useInvoiceTabStore()

  // Fallback về tabs[0] nếu activeTabId chưa set hoặc không tìm thấy
  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  )

  // ── Computed values ────────────────────────────────────────────────────────

  /** Tổng tiền vàng/hàng (unitPrice × qty) — chưa bao gồm fees và discount */
  const subtotal = useMemo(
    () => calcSubtotal(activeTab?.items ?? []),
    [activeTab?.items]
  )

  /** Tổng thanh toán = Σ(unitPrice × qty + laborFee + stoneFee) − discount, tối thiểu 0 */
  const total = useMemo(
    () => calcTotal(activeTab?.items ?? [], activeTab?.discountAmount ?? 0),
    [activeTab?.items, activeTab?.discountAmount]
  )

  /** Tổng số lượng sản phẩm trong cart */
  const totalQty = activeTab?.items.reduce((s, i) => s + i.qty, 0) ?? 0

  // ── Actions ────────────────────────────────────────────────────────────────

  const setCustomer = (id: string, name: string) => {
    if (activeTab) updateTab(activeTab.id, { customerId: id, customerName: name })
  }

  const clearCustomer = () => {
    if (activeTab) updateTab(activeTab.id, { customerId: null, customerName: null })
  }

  const setNote = (note: string) => {
    if (activeTab) updateTab(activeTab.id, { note })
  }

  // Coupon không có API thực — chỉ hỗ trợ nhập tay discountAmount
  const applyDiscount = (discountAmount: number) => {
    if (activeTab) updateTab(activeTab.id, { discountAmount })
  }

  const clearDiscount = () => {
    if (activeTab) updateTab(activeTab.id, { couponCode: null, discountAmount: 0 })
  }

  return {
    tab: activeTab,
    subtotal,
    total,
    totalQty,

    // Cart actions (tác động lên active tab, dùng inventoryItemId làm key)
    addItem: addItemToActive,
    removeItem: removeItemFromActive,
    deleteItem: deleteItemFromActive,
    setQty: setItemQtyInActive,
    clearCart: clearActiveCart,

    // Tab metadata actions
    setCustomer,
    clearCustomer,
    setNote,
    applyDiscount,
    clearDiscount,
  }
}
