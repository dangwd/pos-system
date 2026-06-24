/**
 * lib/buy-back.ts — Kiểm tra HĐ gốc còn hạn áp giá gốc khi thu mua lại.
 *
 * Theo docs `Frontend — Kiểm tra Hóa Đơn còn hạn (SystemConfig)` §2.
 * 3 field (daysSincePurchase, buyBackOriginalPriceEnabled, buyBackOriginalPriceMaxDays)
 * được backend nhúng PHẲNG vào mỗi transaction (list + detail) — FE đọc trực tiếp,
 * KHÔNG cần gọi thêm GET /api/config/system.
 */

import type { PriceItem } from '@/types/config'

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

/**
 * Giá vàng cũ thu vào (₭/gram) — dùng CHUNG cho lúc link HĐ và lúc recompute
 * khi đổi cấu hình/bảng giá. Còn hạn → giá gốc HĐ; hết hạn/tắt → giá MUA VÀO
 * hiện hành đúng tuổi vàng (purity) từ bảng giá; không khớp dòng nào → giá gốc HĐ.
 */
export function resolveExchangeInPricePerGram(args: {
  priceItems: PriceItem[]
  purity: string
  weightUnitId: string | null
  originalUnitPriceLak: number // giá gốc HĐ / đơn vị
  perUnitGram: number          // gram / đơn vị của item (vd 3.75 cho Chỉ)
  enabled: boolean
  maxDays: number
  daysSincePurchase: number
}): number {
  // Khớp dần: tuổi vàng + đơn vị → tuổi vàng → đơn vị → dòng đầu.
  const m =
    args.priceItems.find(p => p.purityCode === args.purity && p.weightUnitId === args.weightUnitId)
    ?? args.priceItems.find(p => p.purityCode === args.purity)
    ?? args.priceItems.find(p => p.weightUnitId === args.weightUnitId)
    ?? args.priceItems[0]
  const gramPerUnit = m?.gramPerUnit ?? args.perUnitGram
  const originalPerGram = args.perUnitGram > 0 ? args.originalUnitPriceLak / args.perUnitGram : 0
  const currentBuyPerGram = m && m.buyPrice > 0 ? m.buyPrice / gramPerUnit : 0
  const status = getBuyBackStatus({
    buyBackOriginalPriceEnabled: args.enabled,
    buyBackOriginalPriceMaxDays: args.maxDays,
    daysSincePurchase: args.daysSincePurchase,
  })
  return status.canApplyOriginalPrice
    ? originalPerGram
    : currentBuyPerGram > 0 ? currentBuyPerGram : originalPerGram
}
