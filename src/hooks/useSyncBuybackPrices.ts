/**
 * useSyncBuybackPrices — Recompute giá vàng cũ (ExchangeIn lấy từ HĐ) khi cấu
 * hình buyback hoặc bảng giá thay đổi.
 *
 * Lý do: tab được lưu localStorage (persist) nên `unitPriceLakPerGram` tính lúc
 * link HĐ bị "đóng băng" — bật/tắt thiết lập hay đổi bảng giá sẽ không cập nhật.
 *
 * Cơ chế: mỗi item lưu `buyBackSig` (chữ ký cấu hình lúc tính). Hook so chữ ký
 * hiện hành; chỉ recompute item nào LỆCH chữ ký →
 *  - reload sau khi đổi thiết lập → cập nhật lại đúng (sig cũ ≠ sig mới),
 *  - cấu hình không đổi → GIỮ nguyên (kể cả giá đã sửa tay),
 *  - hội tụ sau 1 lượt (sau update sig khớp → không lặp).
 *
 * Item thêm thủ công (không có `originalUnitPriceLak`) không bị động tới.
 */

import { useEffect } from 'react'
import { useSystemConfig, useActivePriceConfig } from './useConfig'
import { useActiveTab } from './useActiveTab'
import { getBuyBackStatus, resolveExchangeInPricePerGram } from '@/lib/buy-back'
import type { CartItem, CartItemBuyBack } from '@/types/cart'

export function useSyncBuybackPrices() {
  const { data: sysConfig } = useSystemConfig()
  const { priceConfig, priceTableId } = useActivePriceConfig()
  const { tab, updateCartItem } = useActiveTab()

  useEffect(() => {
    if (!sysConfig || !priceConfig || !tab) return
    const enabled = sysConfig.buyBackOriginalPriceEnabled
    const maxDays = sysConfig.buyBackOriginalPriceMaxDays
    const sig = `${enabled}|${maxDays}|${priceTableId ?? ''}`

    for (const item of tab.items) {
      if (
        item.itemRole !== 'ExchangeIn' ||
        item.originalUnitPriceLak == null ||
        item.daysSincePurchase == null ||
        item.buyBackSig === sig // đã tính với cấu hình này → giữ (kể cả đã sửa tay)
      ) {
        continue
      }
      const days = item.daysSincePurchase
      const newPerGram = resolveExchangeInPricePerGram({
        priceItems: priceConfig.items,
        purity: item.purity,
        weightUnitId: item.weightUnitId,
        originalUnitPriceLak: item.originalUnitPriceLak,
        perUnitGram: item.weightGram,
        enabled,
        maxDays,
        daysSincePurchase: days,
      })
      const status = getBuyBackStatus({
        buyBackOriginalPriceEnabled: enabled,
        buyBackOriginalPriceMaxDays: maxDays,
        daysSincePurchase: days,
      })
      const buyBack: CartItemBuyBack | undefined =
        status.reason === 'feature_disabled'
          ? undefined
          : {
              withinWindow: status.canApplyOriginalPrice,
              reason: status.reason,
              daysRemaining: status.daysRemaining,
              maxDays,
            }
      const patch: Partial<CartItem> = { unitPriceLakPerGram: newPerGram, buyBackSig: sig }
      patch.buyBack = buyBack
      updateCartItem(item.productId, patch)
    }
  }, [sysConfig, priceConfig, priceTableId, tab, updateCartItem])
}
