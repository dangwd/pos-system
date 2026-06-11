/**
 * Cart.Item — Sub-component của Cart compound
 *
 * Đọc item từ CartContext (active tab) bằng productId.
 * Gọi InvoiceTabStore actions để thay đổi qty hoặc xóa.
 */

'use client'

import { Button } from '@/components/ui/button'
import { useCartContext } from './index'
import { lineTotal } from '@/types/cart'
import { Minus, Plus, Trash2 } from 'lucide-react'

function formatKip(amount: number) {
  return amount.toLocaleString('lo-LA') + ' ₭'
}

interface CartItemProps {
  productId: string
}

export function CartItem({ productId }: CartItemProps) {
  const { items, actions } = useCartContext()
  const item = items.find(i => i.productId === productId)

  // Item có thể không tồn tại nếu vừa bị xóa — render null an toàn
  if (!item) return null

  return (
    <div className="flex items-center gap-2 py-2 border-b last:border-0">

      {/* Tên + đơn giá */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{formatKip(item.unitPriceLakPerGram)} / g</p>
      </div>

      {/* Điều chỉnh số lượng */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => actions.removeItem(productId)}
          aria-label="Giảm số lượng"
        >
          <Minus className="h-3 w-3" />
        </Button>

        <input
          type="number"
          min={1}
          value={item.qty}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v)) actions.setQty(productId, v)
          }}
          className="w-8 text-center text-sm font-medium bg-transparent border-none outline-none"
          aria-label="Số lượng"
        />

        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={() => actions.addItem({ ...item, qty: 1 })}
          aria-label="Tăng số lượng"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Thành tiền */}
      <p className="w-24 text-right text-sm font-semibold shrink-0">
        {formatKip(lineTotal(item))}
      </p>

      {/* Xóa hoàn toàn khỏi giỏ */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-destructive hover:text-destructive shrink-0"
        onClick={() => actions.deleteItem(productId)}
        aria-label="Xóa sản phẩm"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}
