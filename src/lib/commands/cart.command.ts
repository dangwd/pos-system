/**
 * cart.command.ts — Command Pattern cho thao tác giỏ hàng
 *
 * Mỗi CartCommand có execute() và undo().
 * CartCommandInvoker giữ lịch sử để undo từng bước.
 * Dùng productId làm key định danh item trong giỏ.
 */

import type { CartStore } from '@/stores/cart.store'
import type { CartItem } from '@/types/cart'

export interface CartCommand {
  execute(): void
  undo(): void
}

export class AddItemCommand implements CartCommand {
  constructor(private store: CartStore, private item: CartItem) {}

  execute() { this.store.add(this.item) }
  undo()    { this.store.decreaseOrRemove(this.item.productId) }
}

export class RemoveItemCommand implements CartCommand {
  private snapshot: CartItem | undefined

  constructor(private store: CartStore, private productId: string) {}

  execute() {
    this.snapshot = this.store.getItem(this.productId)
    this.store.remove(this.productId)
  }

  undo() {
    if (this.snapshot) this.store.restore(this.snapshot)
  }
}

export class UpdateQtyCommand implements CartCommand {
  private prevQty = 0

  constructor(
    private store: CartStore,
    private productId: string,
    private qty: number
  ) {}

  execute() {
    this.prevQty = this.store.getItem(this.productId)?.qty ?? 0
    this.store.setQty(this.productId, this.qty)
  }

  undo() { this.store.setQty(this.productId, this.prevQty) }
}

export class ClearCartCommand implements CartCommand {
  private snapshot: CartItem[] = []

  constructor(private store: CartStore) {}

  execute() {
    this.snapshot = [...this.store.items]
    this.store.clear()
  }

  undo() { this.store.restoreAll(this.snapshot) }
}

export class CartCommandInvoker {
  private history: CartCommand[] = []

  run(cmd: CartCommand) {
    cmd.execute()
    this.history.push(cmd)
  }

  undo() { this.history.pop()?.undo() }

  clearHistory() { this.history = [] }

  get canUndo() { return this.history.length > 0 }
}
