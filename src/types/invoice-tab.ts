/**
 * Invoice Tab System — Data Model
 *
 * Mỗi InvoiceTab là một hóa đơn độc lập, có cart riêng biệt.
 * Thu ngân có thể mở nhiều tab song song và switch qua lại mà không mất dữ liệu.
 */

import type { CartItem } from './cart'

// ─── Trạng thái hóa đơn ──────────────────────────────────────────────────────

/** draft: đang soạn | holding: tạm giữ | paying: đang trong flow thanh toán */
export type InvoiceStatus = 'draft' | 'holding' | 'paying'

// ─── Entity ───────────────────────────────────────────────────────────────────

export interface InvoiceTab {
  /** uuid — dùng làm key, KHÔNG dùng array index (index thay đổi khi đóng tab giữa) */
  id: string
  /** Label hiển thị: "HĐ-001", "HĐ-002", tự tăng */
  label: string
  status: InvoiceStatus
  /** ISO string để persist tốt qua JSON (Date không serialize đúng) */
  createdAt: string

  // ── Cart state — MỖI tab có cart riêng, không share với tab khác ──────────
  items: CartItem[]
  customerId: string | null
  customerName: string | null
  couponCode: string | null
  /** Số tiền giảm giá tuyệt đối (đã tính từ %) — compute khi apply coupon */
  discountAmount: number
  note: string
}

// ─── Store interface ──────────────────────────────────────────────────────────

export interface InvoiceTabStore {
  tabs: InvoiceTab[]
  activeTabId: string | null

  // Tab lifecycle
  openTab: () => void
  closeTab: (id: string) => void                   // giữ ít nhất 1 tab; block nếu 'paying'
  switchTab: (id: string) => void
  duplicateTab: (id: string) => void
  holdTab: (id: string) => void
  updateTab: (id: string, patch: Partial<InvoiceTab>) => void

  // Cart mutations — luôn tác động lên active tab
  addItemToActive: (item: CartItem) => void
  removeItemFromActive: (productId: string) => void  // giảm qty 1; xóa nếu qty = 0
  deleteItemFromActive: (productId: string) => void  // xóa hoàn toàn
  setItemQtyInActive: (productId: string, qty: number) => void
  clearActiveCart: () => void

  /** Trả về tab đang active (fallback tab[0] nếu activeTabId null) */
  getActiveTab: () => InvoiceTab | undefined
}
