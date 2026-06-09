/**
 * cart.store.ts — Legacy simple cart store (dùng cho Command Pattern undo/redo)
 *
 * Lưu ý: CartItem trong InvoiceTabStore là canonical source of truth cho POS.
 * Store này chỉ dùng bởi CartCommandInvoker (undo/redo layer).
 * Dùng inventoryItemId làm key thay vì id cũ.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem } from '@/types/cart'

export interface CartStore {
  items: CartItem[]
  discountAmount: number

  add: (item: CartItem) => void
  remove: (inventoryItemId: string) => void
  decreaseOrRemove: (inventoryItemId: string) => void
  setQty: (inventoryItemId: string, qty: number) => void
  restore: (item: CartItem) => void
  restoreAll: (items: CartItem[]) => void
  clear: () => void
  getItem: (inventoryItemId: string) => CartItem | undefined

  get subtotal(): number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      discountAmount: 0,

      add(item) {
        set(state => {
          const existing = state.items.find(i => i.inventoryItemId === item.inventoryItemId)
          if (existing) {
            return {
              items: state.items.map(i =>
                i.inventoryItemId === item.inventoryItemId ? { ...i, qty: i.qty + 1 } : i
              ),
            }
          }
          return { items: [...state.items, { ...item, qty: 1 }] }
        })
      },

      remove(inventoryItemId) {
        set(state => ({ items: state.items.filter(i => i.inventoryItemId !== inventoryItemId) }))
      },

      decreaseOrRemove(inventoryItemId) {
        set(state => {
          const item = state.items.find(i => i.inventoryItemId === inventoryItemId)
          if (!item) return {}
          if (item.qty <= 1) return { items: state.items.filter(i => i.inventoryItemId !== inventoryItemId) }
          return { items: state.items.map(i => i.inventoryItemId === inventoryItemId ? { ...i, qty: i.qty - 1 } : i) }
        })
      },

      setQty(inventoryItemId, qty) {
        if (qty <= 0) { get().remove(inventoryItemId); return }
        set(state => ({
          items: state.items.map(i => i.inventoryItemId === inventoryItemId ? { ...i, qty } : i),
        }))
      },

      restore(item) {
        set(state => {
          const exists = state.items.find(i => i.inventoryItemId === item.inventoryItemId)
          if (exists) return state
          return { items: [...state.items, item] }
        })
      },

      restoreAll(items) { set({ items }) },

      clear() { set({ items: [], discountAmount: 0 }) },

      getItem(inventoryItemId) {
        return get().items.find(i => i.inventoryItemId === inventoryItemId)
      },

      get subtotal() {
        return get().items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
      },
    }),
    { name: 'pos-cart-legacy' }
  )
)
