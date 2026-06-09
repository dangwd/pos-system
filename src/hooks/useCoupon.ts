/**
 * useCoupon — Giảm giá thủ công cho active tab
 *
 * API thực không có endpoint coupon (đã xác nhận với backend).
 * Giảm giá được nhập tay bởi thu ngân dưới dạng số tiền tuyệt đối (₭).
 *
 * TODO: Tích hợp coupon API khi backend bổ sung endpoint.
 */

import { useActiveTab } from './useActiveTab'

export function useCoupon() {
  const { applyDiscount, clearDiscount } = useActiveTab()

  return {
    /** Áp dụng giảm giá theo số tiền tuyệt đối (₭) */
    applyAmount: (discountAmount: number) => applyDiscount(discountAmount),

    /** Xóa giảm giá */
    clear: clearDiscount,
  }
}
