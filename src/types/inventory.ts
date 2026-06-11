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
export type InventoryStatus = 'TiepNhan' | 'TrenQuay' | 'DaBan' | 'ChuyenXuong'

/** Nguồn gốc hàng hóa */
export type InventorySource = 'Quan' | 'Ngoai'

/** Hướng điều chỉnh kho */
export type AdjustDirection = 'IN' | 'OUT'

// ─── Entities ─────────────────────────────────────────────────────────────────

/** Một mục trong kho hàng (GET /api/inventory) */
export interface InventoryItem {
  id: string
  branchId: string
  productCode: string        // Mã sản phẩm (snapshot)
  productName: string        // Tên sản phẩm (snapshot)
  category: string           // Mã danh mục (ví dụ: "VANG_24K")
  purity: string             // Tuổi vàng (ví dụ: "24K")
  trayId: string             // Mã khay trưng bày (ví dụ: "KHAY-A1")
  quantity: number           // Số lượng hiện tại
  weightGram: number         // Tổng trọng lượng (gram)
  trangThai: InventoryStatus
  nguonGoc: InventorySource
  lastUpdatedAt: string      // ISO 8601
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
  status?: InventoryStatus   // TiepNhan | TrenQuay | DaBan | ChuyenXuong
  nguonGoc?: InventorySource // Quan | Ngoai
  page?: number
  pageSize?: number
}
