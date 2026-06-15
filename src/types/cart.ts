/**
 * types/cart.ts
 *
 * CartItem là đơn vị dữ liệu trong giỏ hàng của InvoiceTab.
 * Khi submit giao dịch, CartItem được map sang CreateTransactionItemDto.
 */

import type { ProductType } from "./product";

export interface CartItem {
  // ── IDs cần cho API ──────────────────────────────────────────────────────────
  productId: string;

  // ── Thông tin hiển thị (snapshot tại thời điểm thêm vào giỏ) ─────────────────
  name: string;
  purity: string;
  weightGram: number;
  productType: ProductType;
  categoryName: string;

  // ── Đơn vị & trọng lượng ─────────────────────────────────────────────────────
  weightUnitId: string | null;
  /** Tên đơn vị để hiển thị, ví dụ: "Chỉ", "Lượng", "Gram" */
  weightUnitName: string | null;
  weightGramOverride: number | null;

  // ── Số lượng & giá ───────────────────────────────────────────────────────────
  qty: number;
  unitPriceLakPerGram: number; // Giá snapshot (₭/gram)
  laborFee: number; // Phí gia công thợ (₭) — nhân viên nhập tay
  stoneFee: number; // Phí đá đính kèm (₭) — nhân viên nhập tay

  // ── Vai trò & trường ExchangeGold / BuyGold ───────────────────────────────────
  /** Normal = hàng bán ra (SellGold/BuyGold) | ExchangeIn = vàng cũ đổi vào */
  itemRole: "Normal" | "ExchangeIn";
  /** PHÍ KHÒ (₭) — chi phí đúc lại khi vàng bị hỏng; áp dụng ExchangeIn & BuyGold */
  perItemDamage: number;
  /** HAO HỤT (chỉ) — hao hụt trọng lượng do mài mòn; áp dụng ExchangeIn & BuyGold */
  perItemWearChi: number;
  /** true = kích hoạt ô nhập Tiền công*/
  isDamaged: boolean;
  /** true = item từ HĐ cũ liên kết, không cho chỉnh sửa SL/giá */
  isReadOnly: boolean;
}

/**
 * Tính thành tiền một dòng hàng.
 *
 * Normal (SellGold):  totalGram × unitPrice + laborFee + stoneFee
 * Normal (BuyGold):   totalGram × unitPrice − perItemDamage − laoSutLak
 *   (perItemDamage và perItemWearChi = 0 với SellGold nên công thức tương thích)
 * ExchangeIn:         totalGram × unitPrice − perItemDamage − laoSutLak
 */
export function lineTotal(item: CartItem): number {
  const totalGram =
    item.weightGramOverride !== null
      ? item.weightGramOverride
      : item.qty * item.weightGram;

  // 1 chỉ = 3.75 gram; HAO HỤT tính bằng chỉ → đổi sang ₭
  const laoSutLak = Math.round(
    item.perItemWearChi * 3.75 * item.unitPriceLakPerGram,
  );

  if (item.itemRole === "ExchangeIn") {
    return (
      Math.round(totalGram * item.unitPriceLakPerGram) -
      item.perItemDamage -
      laoSutLak
    );
  }

  // Normal: BuyGold trừ PHÍ KHÒ / HAO HỤT; SellGold hai trường này luôn = 0
  return (
    Math.round(totalGram * item.unitPriceLakPerGram) +
    item.laborFee +
    item.stoneFee -
    item.perItemDamage -
    laoSutLak
  );
}

export interface CartState {
  items: CartItem[];
  discountAmount: number;
  couponCode: string | null;
}
