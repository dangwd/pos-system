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
  | 'ChuyenXuong'   // Chuyển xuống xưởng (vàng ngoài / lỗi / item cũ sau thu đổi)
  | 'DaBan'         // Đã bán ra (set tự động qua giao dịch POS)
  | 'DoiRa'         // Đã đổi ra / trade-out (set tự động qua giao dịch POS)

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
  counterId: string          // Guid quầy giao dịch (Migration: 20260611042622)
  counterName: string        // Tên quầy (snapshot)
  productCode: string        // Mã sản phẩm (snapshot)
  productName: string        // Tên sản phẩm (snapshot)
  category: string           // Mã danh mục (ví dụ: "VANG_24K")
  purity: string             // Tuổi vàng (ví dụ: "24K")
  trayId: string             // Mã khay trưng bày (ví dụ: "KHAY-A1")
  quantity: number           // Số lượng hiện tại
  weightGram: number         // Tổng trọng lượng lô (gram) — = mỗi món × quantity
  weightUnitId: string | null // FK → WeightUnit; null với đá/ngoại tệ
  trangThai: InventoryStatus
  nguonGoc: InventorySource
  lastUpdatedAt: string      // ISO 8601
}

/** Một dòng sản phẩm trong phiếu điều chỉnh */
export interface InventoryAdjustmentLine {
  id: string
  inventoryItemId: string
  productCode: string             // Mã sản phẩm (snapshot)
  productName: string             // Tên sản phẩm (snapshot)
  purity: string | null           // Hàm lượng (vd "9999")
  weightUnitId: string | null     // ID đơn vị tính → map sang tên qua useWeightUnits
  quantity: number
  actualValue: number | null      // Giá trị thực dòng hàng (LAK)
}

/**
 * Phiếu điều chỉnh tồn kho (`InventoryAdjustment`, mã `ADJ-xxx`).
 * Một phiếu thuần một chiều (IN | OUT), một lý do + một PTTT chung, gồm nhiều dòng sản phẩm.
 */
export interface InventoryAdjustment {
  id: string
  adjustmentCode: string          // ADJ-001, ADJ-002, ...
  branchId: string
  branchName: string
  counterId: string
  counterName: string             // Tên quầy (snapshot)
  direction: AdjustDirection
  reason: string
  paymentMethod: 'CASH' | 'BANK' | null
  totalValue: number | null       // Tổng giá trị phiếu (LAK)
  nguonGoc: InventorySource | null // Nguồn gốc lô — chỉ có khi direction=IN
  supplier: string | null         // Nhà cung cấp
  createdAt: string               // ISO 8601
  totalQuantity: number           // Tổng SL toàn phiếu (= Σ lines.quantity)
  lines: InventoryAdjustmentLine[]
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** POST /api/inventory/{id}/adjust */
export interface AdjustInventoryDto {
  direction: AdjustDirection
  quantity: number
  weightGram: number                 // Tổng trọng lượng điều chỉnh (= quantity × perPieceGram)
  reason: string
  nguonGoc?: InventorySource         // Bắt buộc khi direction=IN: "Quan" | "Ngoai"
  paymentMethod?: 'CASH' | 'BANK'   // Phương thức thanh toán (nếu có)
  actualValue?: number               // Giá trị thực tế lô hàng (LAK)
  documentRef?: string | null        // Số chứng từ (lưu nhưng chưa validate — mở rộng sau)
  supplier?: string | null           // Nhà cung cấp (lưu nhưng chưa validate — mở rộng sau)
}

/** Kết quả POST /api/inventory/{id}/adjust — backend trả `{ item, adjustment }` */
export interface AdjustInventoryResult {
  item: InventoryItem
  adjustment: InventoryAdjustment
}

/** PATCH /api/inventory/{id}/status */
export interface UpdateInventoryStatusDto {
  trangThai: InventoryStatus
}

/** Query params cho GET /api/inventory */
export interface InventoryListParams {
  branchId?: string
  counterId?: string         // Lọc theo quầy giao dịch
  category?: string          // Mã danh mục
  status?: InventoryStatus   // TiepNhan | DaDinhGia | TrenQuay | DaBan | ChuyenXuong
  nguonGoc?: InventorySource // Quan | Ngoai
  keyword?: string           // Tìm theo mã SP, tên, loại, tên quầy
  page?: number
  pageSize?: number
}

/** Query params cho GET /api/inventory/adjustments */
export interface InventoryAdjustmentParams {
  branchId?: string
  counterId?: string
  direction?: AdjustDirection  // Lọc theo hướng IN | OUT
  keyword?: string             // Tìm theo mã ADJ, tên SP, lý do, tên chi nhánh
  page?: number
  pageSize?: number
}

// ─── Bulk update ──────────────────────────────────────────────────────────────

/** Một item trong PATCH /api/inventory/bulk */
export interface BulkUpdateInventoryItem {
  id: string
  trangThai: InventoryStatus
}

/** Request body PATCH /api/inventory/bulk */
export interface BulkUpdateInventoryDto {
  items: BulkUpdateInventoryItem[]
}

/** Response PATCH /api/inventory/bulk — partial success */
export interface BulkUpdateInventoryResult {
  updatedCount: number
  notFoundIds: string[]       // IDs không tìm thấy (partial success)
}

// ─── Tạo phiếu điều chỉnh (nhập/xuất nhiều dòng) ──────────────────────────────

/** Một dòng trong POST /api/inventory/adjustments */
export interface CreateInventoryAdjustmentLine {
  itemId: string
  quantity: number
  actualValue?: number              // Giá trị thực dòng hàng (LAK) — chỉ ý nghĩa với IN
}

/**
 * Request body POST /api/inventory/adjustments — tạo MỘT phiếu thuần một chiều.
 * direction / reason / paymentMethod / nguonGoc / supplier là CHUNG cho cả phiếu.
 * Tất cả các dòng phải thuộc cùng một quầy. Phiếu atomic: 1 dòng lỗi → cả phiếu bị từ chối.
 */
export interface CreateInventoryAdjustmentDto {
  direction: AdjustDirection
  reason: string
  lines: CreateInventoryAdjustmentLine[]
  paymentMethod?: 'CASH' | 'BANK'   // Chỉ ý nghĩa với IN
  nguonGoc?: InventorySource        // Bắt buộc khi IN: "Quan" | "Ngoai"
  supplier?: string | null          // Nhà cung cấp (IN)
}

/** Response POST /api/inventory/adjustments — phiếu vừa tạo (header + lines) */
export type CreateInventoryAdjustmentResult = InventoryAdjustment
