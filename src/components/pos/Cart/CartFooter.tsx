/**
 * Cart.Footer — Sub-component của Cart compound
 *
 * Hiển thị tóm tắt giá: tạm tính, giảm giá, tổng cộng.
 * Đọc từ CartContext — tự cập nhật khi switch tab hoặc thay đổi items.
 */

'use client'

import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useCartContext } from './index'

function formatVND(amount: number) {
  return amount.toLocaleString('vi-VN') + '₫'
}

export function CartFooter() {
  const { subtotal, total, discountAmount, couponCode } = useCartContext()

  return (
    <div className="space-y-1 pt-2">
      <Separator />

      {/* Tạm tính */}
      <div className="flex justify-between text-sm text-muted-foreground pt-2">
        <span>Tạm tính</span>
        <span>{formatVND(subtotal)}</span>
      </div>

      {/* Giảm giá — chỉ hiện khi có */}
      {discountAmount > 0 && (
        <div className="flex items-center justify-between text-sm text-green-600">
          <div className="flex items-center gap-1.5">
            <span>Giảm giá</span>
            {couponCode && (
              <Badge variant="outline" className="text-[10px] h-4 text-green-600 border-green-300">
                {couponCode}
              </Badge>
            )}
          </div>
          <span>-{formatVND(discountAmount)}</span>
        </div>
      )}

      {/* Tổng cộng */}
      <div className="flex justify-between font-bold text-base pt-1">
        <span>Tổng cộng</span>
        <span className="text-primary">{formatVND(total)}</span>
      </div>
    </div>
  )
}
