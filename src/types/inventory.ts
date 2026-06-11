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

/**
 * Trạng thái mục kho (`ItemTrangThai`) — vòng đời:
 *   TiepNhan → DaDinhGia → TrenQuay → DaBan | ChuyenXuong
 * (xem "Sơ đồ Kiến trúc & Luồng Nghiệp vụ" §11.2)
 */
export type InventoryStatus =
  | 'TiepNhan'      // Vừa tiếp nhận, chưa định giá (mặc định khi nhập)
  | 'DaDinhGia'     // Đã định giá
  | 'TrenQuay'      // Đang trưng bày, có thể bán
  | 'DaBan'         // Đã bán ra
  | 'ChuyenXuong'   // Chuyển xuống xưởng (vàng ngoài / lỗi / item cũ sau thu đổi)

/** Nguồn gốc hàng hóa */
export type InventorySource =
  | 'Quan'   // Vàng của quán (mua thêm / đổi hàng / đổi miễn phí)
  | 'Ngoai'  // Vàng ngoài (chỉ mua vào, chuyển xuống xưởng)

/** Hướng điều chỉnh kho thủ công */
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

/** Log điều chỉnh kho (`InventoryAdjustmentLog`, mã `ADJ-xxx`) */
export interface InventoryAdjustment {
  id: string
  adjustmentCode: string     // ADJ-001, ADJ-002, ...
  inventoryItemId: string
  productName: string        // Tên sản phẩm (snapshot)
  direction: AdjustDirection
  quantity: number
  weightGram: number         // Trọng lượng biến động (gram)
  reason: string
  createdBy: string
  createdAt: string          // ISO 8601
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** POST /api/inventory/{id}/adjust */
export interface AdjustInventoryDto {
  direction: AdjustDirection
  quantity: number
  reason: string
}

/** Kết quả POST /api/inventory/{id}/adjust — backend trả `{ item, log }` */
export interface AdjustInventoryResult {
  item: InventoryItem
  log: InventoryAdjustment
}

/** PATCH /api/inventory/{id}/status */
export interface UpdateInventoryStatusDto {
  trangThai: InventoryStatus
}

/** Query params cho GET /api/inventory */
export interface InventoryListParams {
  branchId?: string
  category?: string          // Mã danh mục
  trayId?: string
  status?: InventoryStatus   // TiepNhan | DaDinhGia | TrenQuay | DaBan | ChuyenXuong
  nguonGoc?: InventorySource // Quan | Ngoai
  page?: number
  pageSize?: number
}

/** Query params cho GET /api/inventory/adjustments */
export interface InventoryAdjustmentParams {
  branchId?: string
  limit?: number             // Mặc định 20
}
