/**
 * useExchangeFreeStatus — Trạng thái hạn Đổi Miễn Phí của HĐ gốc đang liên kết.
 *
 * Theo docs "Kiểm tra HĐ còn hạn" §3: ExchangeFree KHÔNG nhúng sẵn field →
 * đọc cài đặt từ GET /api/config/system + tự tính ngày từ transactedAt HĐ gốc.
 *
 * Trả null khi: tab không phải ExchangeFree / chưa liên kết HĐ / chưa có config.
 */

import { useActiveTab } from './useActiveTab'
import { useSystemConfig } from './useConfig'
import { getExchangeFreeStatus, type ExchangeFreeStatus } from '@/lib/exchange-free'

export function useExchangeFreeStatus(): ExchangeFreeStatus | null {
  const { tab } = useActiveTab()
  const { data: config } = useSystemConfig()

  if (tab?.txnType !== 'ExchangeFree') return null
  if (!tab.linkedInvoiceCode || !tab.linkedInvoiceTransactedAt) return null
  if (!config) return null

  return getExchangeFreeStatus(tab.linkedInvoiceTransactedAt, config)
}
