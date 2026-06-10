/**
 * types/inventory.ts
 *
 * Khớp với response của:
 *   GET    /api/inventory
 *   GET    /api/inventory/{id}
 *   POST   /api/inventory/{id}/adjust
 *   PATCH  /api/inventory/{id}/status
 *   GET    /api/inventory/adjustments
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Trạng thái tồn kho */
export type InventoryStatus = 'Available' | 'Reserved' | 'Sold' | 'Returned'

/** Nguồn gốc hàng hóa */
export type InventorySource = 'New' | 'TradeIn' | 'Adjusted'

/** Hướng điều chỉnh kho */
export type AdjustDirection = 'In' | 'Out'

// ─── Entities ─────────────────────────────────────────────────────────────────

/** Một mục trong kho hàng (GET /api/inventory) */
export interface InventoryItem {
  id: string
  productId: string
  productName: string        // Tên sản phẩm (snapshot)
  branchId: string
  quantity: number           // Số lượng hiện tại
  weightGram: number         // Tổng trọng lượng (gram)
  trangThai: InventoryStatus
  nguonGoc: InventorySource
  trayId: string             // Mã khay trưng bày (ví dụ: "KHAY-A1")
  updatedAt: string          // ISO 8601
}

/** Log điều chỉnh kho */
export interface InventoryAdjustment {
  id: string
  direction: AdjustDirection
  quantity: number
  reason: string
  createdAt: string
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** POST /api/inventory/{id}/adjust */
export interface AdjustInventoryDto {
  direction: AdjustDirection
  quantity: number
  reason: string
}

/** PATCH /api/inventory/{id}/status */
export interface UpdateInventoryStatusDto {
  trangThai: InventoryStatus
}

/** Query params cho GET /api/inventory */
export interface InventoryListParams {
  branchId?: string
  category?: string
  trayId?: string
  status?: InventoryStatus
  nguonGoc?: InventorySource
}
