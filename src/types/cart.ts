/**
 * types/cart.ts
 *
 * CartItem là đơn vị dữ liệu trong giỏ hàng của InvoiceTab.
 * Khi submit giao dịch, CartItem được map sang CreateTransactionItemDto.
 *
 * Lưu ý quan trọng:
 *  - inventoryItemId: bắt buộc khi gửi lên API (backend validate tồn kho)
 *  - unitPrice: giá snapshot tại thời điểm thêm vào giỏ — KHÔNG dùng giá sản phẩm catalog
 *  - laborFee, stoneFee: nhân viên nhập tay — mặc định 0
 */

export interface CartItem {
  // ── IDs cần cho API ──────────────────────────────────────────────────────────
  inventoryItemId: string  // ID từ Inventory — bắt buộc khi tạo transaction
  productId: string        // ID sản phẩm gốc

  // ── Thông tin hiển thị (snapshot tại thời điểm thêm vào giỏ) ─────────────────
  name: string             // productName
  purity: string           // Tuổi vàng: "9999", "24K", "18K"
  weightPerUnitMg: number  // Trọng lượng / đơn vị (milligram)
  categoryName: string     // Tên danh mục để hiển thị badge

  // ── Số lượng & giá ───────────────────────────────────────────────────────────
  qty: number
  unitPrice: number        // Giá snapshot (₭/chỉ hoặc ₭/gram) — PHẢI set khi add vào giỏ
  laborFee: number         // Phí gia công thợ (₭) — nhân viên nhập tay, default 0
  stoneFee: number         // Phí đá đính kèm (₭) — nhân viên nhập tay, default 0
}

/** Computed: tổng tiền 1 dòng hàng */
export function lineTotal(item: CartItem): number {
  return item.unitPrice * item.qty + item.laborFee + item.stoneFee
}

export interface CartState {
  items: CartItem[]
  discountAmount: number
  couponCode: string | null
}
