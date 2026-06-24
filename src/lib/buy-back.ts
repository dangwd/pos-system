/**
 * lib/buy-back.ts — Kiểm tra HĐ gốc còn hạn áp giá gốc khi thu mua lại.
 *
 * Theo docs `Frontend — Kiểm tra Hóa Đơn còn hạn (SystemConfig)` §2.
 * 3 field (daysSincePurchase, buyBackOriginalPriceEnabled, buyBackOriginalPriceMaxDays)
 * được backend nhúng PHẲNG vào mỗi transaction (list + detail) — FE đọc trực tiếp,
 * KHÔNG cần gọi thêm GET /api/config/system.
 */

export interface BuyBackInput {
  daysSincePurchase: number
  buyBackOriginalPriceEnabled: boolean
  buyBackOriginalPriceMaxDays: number // 0 = không giới hạn
}

export interface BuyBackStatus {
  canApplyOriginalPrice: boolean
  reason: 'feature_disabled' | 'no_limit' | 'within_limit' | 'expired'
  daysRemaining: number | null // null khi không giới hạn / hết hạn / tắt
}

/**
 * canApplyOriginalPrice =
 *   enabled && (maxDays === 0 || daysSincePurchase <= maxDays)
 */
export function getBuyBackStatus(input: BuyBackInput): BuyBackStatus {
  if (!input.buyBackOriginalPriceEnabled) {
    return { canApplyOriginalPrice: false, reason: 'feature_disabled', daysRemaining: null }
  }
  if (input.buyBackOriginalPriceMaxDays === 0) {
    return { canApplyOriginalPrice: true, reason: 'no_limit', daysRemaining: null }
  }
  if (input.daysSincePurchase <= input.buyBackOriginalPriceMaxDays) {
    return {
      canApplyOriginalPrice: true,
      reason: 'within_limit',
      daysRemaining: input.buyBackOriginalPriceMaxDays - input.daysSincePurchase,
    }
  }
  return { canApplyOriginalPrice: false, reason: 'expired', daysRemaining: null }
}
