/**
 * types/cart.ts
 *
 * CartItem là đơn vị dữ liệu trong giỏ hàng của InvoiceTab.
 * Khi submit giao dịch, CartItem được map sang CreateTransactionItemDto.
 */

import type { ProductType } from './product'

export interface CartItem {
  // ── IDs cần cho API ──────────────────────────────────────────────────────────
  productId: string         // ID sản phẩm gốc

  // ── Thông tin hiển thị (snapshot tại thời điểm thêm vào giỏ) ─────────────────
  name: string              // productName
  purity: string            // Tuổi vàng: "9999", "24K", "18K"
  weightGram: number        // Trọng lượng mỗi đơn vị (gram)
  productType: ProductType  // NguyenKhoi | CanThucTe
  categoryName: string      // Tên danh mục để hiển thị badge

  // ── Đơn vị & trọng lượng ─────────────────────────────────────────────────────
  weightUnitId: string | null       // FK → WeightUnit — dùng khi gửi lên API
  weightGramOverride: number | null // Cho sản phẩm CanThucTe — cân thực tế (gram)

  // ── Số lượng & giá ───────────────────────────────────────────────────────────
  qty: number
  unitPriceLakPerGram: number  // Giá snapshot (₭/gram) — PHẢI set khi add vào giỏ
  laborFee: number             // Phí gia công thợ (₭) — nhân viên nhập tay, default 0
  stoneFee: number             // Phí đá đính kèm (₭) — nhân viên nhập tay, default 0
}

/** Computed: tổng tiền 1 dòng hàng */
export function lineTotal(item: CartItem): number {
  const totalGram = item.weightGramOverride !== null
    ? item.weightGramOverride
    : item.qty * item.weightGram
  return totalGram * item.unitPriceLakPerGram + item.laborFee + item.stoneFee
}

export interface CartState {
  items: CartItem[]
  discountAmount: number
  couponCode: string | null
}
