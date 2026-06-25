/**
 * lib/exchange-free.ts — Kiểm tra HĐ gốc còn hạn Đổi Miễn Phí (ExchangeFree).
 *
 * Theo docs `Frontend — Kiểm tra Hóa Đơn còn hạn (SystemConfig)` §3.
 * KHÁC BuyBack: response hóa đơn KHÔNG nhúng sẵn field → FE phải:
 *   1. Đọc cài đặt từ GET /api/config/system (useSystemConfig — cache session).
 *   2. Tự tính daysSincePurchase từ transactedAt của HĐ gốc.
 *   3. Áp công thức bên dưới.
 */

/** Số ngày trọn vẹn kể từ transactedAt → nay (làm tròn xuống, không âm). */
export function getDaysSince(transactedAt: string): number {
  const ms = Date.now() - new Date(transactedAt).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

export interface ExchangeFreeConfig {
  exchangeFreeEnabled: boolean
  exchangeFreeMaxDays: number // BE bắt buộc > 0
}

export interface ExchangeFreeStatus {
  canExchangeFree: boolean
  reason: 'feature_disabled' | 'within_limit' | 'expired'
  daysRemaining: number | null
}

/**
 * canExchangeFree = enabled && daysSincePurchase <= exchangeFreeMaxDays
 * (exchangeFreeMaxDays luôn > 0 — BE validate, không có case = 0).
 */
export function getExchangeFreeStatus(
  transactedAt: string,
  config: ExchangeFreeConfig,
): ExchangeFreeStatus {
  if (!config.exchangeFreeEnabled) {
    return { canExchangeFree: false, reason: 'feature_disabled', daysRemaining: null }
  }
  const days = getDaysSince(transactedAt)
  if (days <= config.exchangeFreeMaxDays) {
    return {
      canExchangeFree: true,
      reason: 'within_limit',
      daysRemaining: config.exchangeFreeMaxDays - days,
    }
  }
  return { canExchangeFree: false, reason: 'expired', daysRemaining: null }
}
