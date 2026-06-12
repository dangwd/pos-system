/**
 * types/cart.ts
 *
 * CartItem là đơn vị dữ liệu trong giỏ hàng của InvoiceTab.
 * Khi submit giao dịch, CartItem được map sang CreateTransactionItemDto.
 */

import type { ProductType } from './product'

export interface CartItem {
  // ── IDs cần cho API ──────────────────────────────────────────────────────────
  productId: string

  // ── Thông tin hiển thị (snapshot tại thời điểm thêm vào giỏ) ─────────────────
  name: string
  purity: string
  weightGram: number
  productType: ProductType
  categoryName: string

  // ── Đơn vị & trọng lượng ─────────────────────────────────────────────────────
  weightUnitId: string | null
  /** Tên đơn vị để hiển thị, ví dụ: "Chỉ", "Lượng", "Gram" */
  weightUnitName: string | null
  weightGramOverride: number | null

  // ── Số lượng & giá ───────────────────────────────────────────────────────────
  qty: number
  unitPriceLakPerGram: number  // Giá snapshot (₭/gram)
  laborFee: number             // Phí gia công thợ (₭) — nhân viên nhập tay
  stoneFee: number             // Phí đá đính kèm (₭) — nhân viên nhập tay

  // ── Vai trò & trường ExchangeGold / BuyGold ───────────────────────────────────
  /** Normal = hàng bán ra (SellGold/BuyGold) | ExchangeIn = vàng cũ đổi vào */
  itemRole: 'Normal' | 'ExchangeIn'
  /** PHÍ KHÒ (₭) — chi phí đúc lại khi vàng cũ bị hỏng; chỉ áp dụng ExchangeIn */
  perItemDamage: number
  /** LAO SUT (chỉ) — hao hụt trọng lượng do mài mòn; chỉ áp dụng ExchangeIn */
  perItemWearChi: number
  /** true = kích hoạt ô nhập PHÍ KHÒ */
  isDamaged: boolean
  /** true = item từ HĐ cũ liên kết, không cho chỉnh sửa SL/giá */
  isReadOnly: boolean
}

/**
 * Tính thành tiền một dòng hàng.
 *
 * Normal:     totalGram × unitPrice + laborFee + stoneFee
 * ExchangeIn: totalGram × unitPrice − PHÍ KHÒ − LAO SUT (chỉ → ₭)
 */
export function lineTotal(item: CartItem): number {
  const totalGram = item.weightGramOverride !== null
    ? item.weightGramOverride
    : item.qty * item.weightGram

  if (item.itemRole === 'ExchangeIn') {
    const goldValue = Math.round(totalGram * item.unitPriceLakPerGram)
    // 1 chỉ = 3.75 gram; LAO SUT tính bằng chỉ → đổi sang ₭
    const laoSutLak = Math.round(item.perItemWearChi * 3.75 * item.unitPriceLakPerGram)
    return goldValue - item.perItemDamage - laoSutLak
  }

  return Math.round(totalGram * item.unitPriceLakPerGram) + item.laborFee + item.stoneFee
}

export interface CartState {
  items: CartItem[]
  discountAmount: number
  couponCode: string | null
}
