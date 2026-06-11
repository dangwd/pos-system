/**
 * cart.store.ts — Legacy simple cart store (dùng cho Command Pattern undo/redo)
 *
 * Lưu ý: CartItem trong InvoiceTabStore là canonical source of truth cho POS.
 * Store này chỉ dùng bởi CartCommandInvoker (undo/redo layer).
 * Dùng productId làm key định danh item trong giỏ.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/cart'
import { lineTotal } from '@/types/cart'

export interface CartStore {
  items: CartItem[]
  discountAmount: number

  add: (item: CartItem) => void
  remove: (productId: string) => void
  decreaseOrRemove: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  restore: (item: CartItem) => void
  restoreAll: (items: CartItem[]) => void
  clear: () => void
  getItem: (productId: string) => CartItem | undefined

  get subtotal(): number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discountAmount: 0,

      add(item) {
        set(state => {
          const existing = state.items.find(i => i.productId === item.productId)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, qty: 1 }] }
        })
      },

      remove(productId) {
        set(state => ({ items: state.items.filter(i => i.productId !== productId) }))
      },

      decreaseOrRemove(productId) {
        set(state => {
          const item = state.items.find(i => i.productId === productId)
          if (!item) return {}
          if (item.qty <= 1) return { items: state.items.filter(i => i.productId !== productId) }
          return { items: state.items.map(i => i.productId === productId ? { ...i, qty: i.qty - 1 } : i) }
        })
      },

      setQty(productId, qty) {
        if (qty <= 0) { get().remove(productId); return }
        set(state => ({
          items: state.items.map(i => i.productId === productId ? { ...i, qty } : i),
        }))
      },

      restore(item) {
        set(state => {
          const exists = state.items.find(i => i.productId === item.productId)
          if (exists) return state
          return { items: [...state.items, item] }
        })
      },

      restoreAll(items) { set({ items }) },

      clear() { set({ items: [], discountAmount: 0 }) },

      getItem(productId) {
        return get().items.find(i => i.productId === productId)
      },

      get subtotal() {
        return get().items.reduce((sum, i) => sum + lineTotal(i), 0)
      },
    }),
    { name: 'pos-cart-legacy' }
  )
)
