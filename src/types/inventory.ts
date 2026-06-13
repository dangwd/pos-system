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

/** Log điều chỉnh kho (`InventoryAdjustmentLog`, mã `ADJ-xxx`) */
export interface InventoryAdjustment {
  id: string
  adjustmentCode: string          // ADJ-001, ADJ-002, ...
  branchId: string
  branchName: string
  counterId: string
  counterName: string             // Tên quầy (snapshot)
  inventoryItemId: string
  productName: string             // Tên sản phẩm (snapshot)
  direction: AdjustDirection
  quantity: number
  weightGram: number              // Tổng trọng lượng điều chỉnh (gram)
  nguonGocLo: InventorySource | null  // Nguồn gốc lô — chỉ có khi direction=IN
  documentRef: string | null      // Số chứng từ
  supplier: string | null         // Nhà cung cấp
  reason: string
  paymentMethod: 'CASH' | 'BANK' | null
  actualValue: number | null      // Giá trị thực tế lô hàng (LAK)
  createdAt: string               // ISO 8601
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
  inventoryItemId?: string     // Lọc theo mục kho cụ thể (dùng trong trang chi tiết)
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

// ─── Bulk adjust (nhập/xuất nhiều mục cùng lúc) ───────────────────────────────

/** Một item trong POST /api/inventory/bulk-adjust */
export interface BulkAdjustInventoryItem {
  id: string
  direction: AdjustDirection
  quantity: number
  reason: string
  paymentMethod?: 'CASH' | 'BANK'   // Phương thức thanh toán (chỉ ý nghĩa với IN)
  actualValue?: number              // Giá trị thực lô hàng (LAK)
  nguonGoc?: InventorySource        // Nguồn gốc lô — bắt buộc khi IN (mirror AdjustInventoryDto)
  documentRef?: string | null       // Số chứng từ / mã phiếu SAP
  supplier?: string | null          // Nhà cung cấp
}

/** Request body POST /api/inventory/bulk-adjust */
export interface BulkAdjustInventoryDto {
  items: BulkAdjustInventoryItem[]
}

/**
 * Response POST /api/inventory/bulk-adjust — partial success.
 * Item thất bại được bỏ qua (không tìm thấy / thiếu tồn); item còn lại vẫn xử lý.
 * Frontend phải kiểm tra cả `notFoundIds` lẫn `insufficientStockIds`.
 */
export interface BulkAdjustInventoryResult {
  adjustedCount: number
  notFoundIds: string[]
  insufficientStockIds: string[]
}
