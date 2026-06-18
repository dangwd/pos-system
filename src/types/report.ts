import type { InventoryStatus, InventorySource } from './inventory'

export interface DashboardReport {
  totalRevenue: number
  totalPurchase: number
  cancelledCount: number
  from: string
  to: string
}

export interface TonKho {
  itemsOnDisplay: number
  totalWeightMg: number
}

export interface TonQuy {
  openingLak: number
  collectedLak: number
  paidLak: number
  closingLak: number
}

export interface DailyReport {
  date: string
  branchId: string
  doanhThuBan: number
  chiPhiMua: number
  doanhThuDoi: number
  laiGopTamTinh: number
  tongHoaDon: number
  tongGiaoDichTrade: number
  tonKho: TonKho
  tonQuy: TonQuy
}

export interface ReportParams {
  from?: string
  to?: string
}

export interface DailyReportParams {
  branchId: string
  date?: string
}

// ─── Báo cáo tồn kho (GET /api/reports/inventory) ─────────────────────────────

export interface InventoryReportCategoryRow {
  category: string
  itemCount: number       // số loại mặt hàng
  totalQuantity: number   // tổng số lượng
  totalWeightGram: number // tổng trọng lượng (gram)
}

export interface InventoryReportStatusRow {
  trangThai: InventoryStatus
  itemCount: number
  totalQuantity: number
  totalWeightGram: number
}

export interface InventoryReportNguonGocRow {
  nguonGoc: InventorySource
  itemCount: number
  totalQuantity: number
  totalWeightGram: number
}

/** Một dòng tồn kho trong danh sách (items.data). */
export interface InventoryReportItem {
  id: string
  branchId: string
  counterId: string
  counterName: string
  productCode: string
  productName: string
  category: string
  purity: string | null
  trayId: string | null
  quantity: number
  weightGram: number
  weightUnitId: string | null
  lastUpdatedAt: string
  trangThai: InventoryStatus
  nguonGoc: InventorySource | null
}

export interface InventoryReportItemsPage {
  data: InventoryReportItem[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

export interface InventoryReport {
  totalItems: number
  totalQuantity: number
  totalWeightGram: number
  // Summary luôn tính trên toàn bộ data theo branchId/counterId (bỏ qua status/keyword).
  byCategory: InventoryReportCategoryRow[]
  byStatus: InventoryReportStatusRow[]
  byNguonGoc: InventoryReportNguonGocRow[]
  // Danh sách chi tiết — chịu ảnh hưởng của status/keyword + phân trang.
  items: InventoryReportItemsPage
}

export interface InventoryReportParams {
  branchId?: string         // bỏ qua → toàn hệ thống
  counterId?: string
  status?: InventoryStatus   // lọc danh sách
  keyword?: string           // tìm mã/tên/danh mục (danh sách)
  page?: number
  pageSize?: number
}

// ─── Báo cáo tồn kho theo kỳ (GET /api/stock/period-report) ───────────────────

export interface StockPeriodSummary {
  openQty: number;    openWeight: number;
  receiptQty: number; issueQty: number;
  midQty: number;     midWeight: number;
  closeQty: number;   closeWeight: number;
}

/** Một dòng chi tiết theo sản phẩm. */
export interface StockPeriodItem {
  productId: string;  productCode: string; productName: string;
  category: string;   karat: string;       unit: string;
  branchId: string;   branchName: string;  source: string;
  openQty: number;    openWeight: number;
  receiptQty: number; issueQty: number;
  midQty: number;     midWeight: number;
  closeQty: number;   closeWeight: number;
}

export interface StockPeriodReport {
  summary: StockPeriodSummary;
  items: StockPeriodItem[];
}

export interface StockPeriodReportParams {
  fromDate: string;   // YYYY-MM-DD
  toDate: string;     // YYYY-MM-DD
  branchId?: string;
  categoryId?: string;
  karat?: string;
  search?: string;
}

// ─── Biến động tồn kho theo thời gian (GET /api/stock/period-report/trend) ─────
// Time-series tồn CUỐI mỗi mốc thời gian (running balance).

export type StockTrendGranularity = 'day' | 'week' | 'month'
export type StockMetal = 'Gold' | 'Silver'

export interface StockTrendPoint {
  date: string;        // ISO datetime của mốc cuối bucket (=== buckets[i])
  closeQty: number;    // tồn SL cuối bucket (đã cộng dồn từ tồn đầu kỳ)
  closeWeight: number; // tồn KL (g) cuối bucket
}

export interface StockTrendSeries {
  branchId: string | null;  // null = gộp toàn hệ thống (dùng cho chế độ "Gộp CN")
  branchName: string;
  metal: StockMetal;
  // Phải có đúng 1 điểm cho mỗi bucket trong `buckets`, cùng thứ tự (carry-forward khi không phát sinh).
  points: StockTrendPoint[];
}

export interface StockTrendReport {
  granularity: StockTrendGranularity;
  fromDate: string;           // ISO datetime
  toDate: string;             // ISO datetime
  buckets: string[];          // trục X — ISO datetime mốc CUỐI mỗi bucket (căn index với points)
  series: StockTrendSeries[];
}

export interface StockTrendParams {
  fromDate: string;           // YYYY-MM-DD
  toDate: string;             // YYYY-MM-DD
  granularity?: StockTrendGranularity;  // default: 'day'
  branchId?: string;
  categoryId?: string;
  karat?: string;
  search?: string;
}

/** Một dòng phát sinh nhập/xuất của 1 sản phẩm trong kỳ (chi tiết khi mở rộng dòng). */
export interface StockMovementLine {
  id: string;
  occurredAt: string;       // ISO 8601
  direction: 'IN' | 'OUT';
  quantity: number;
  weightGram: number;
  refType: 'Transaction' | 'Adjustment';
  refId: string;            // GUID chứng từ nguồn (id GD hoặc id phiếu điều chỉnh)
  refCode: string;          // mã HĐ (invoiceCode) hoặc mã phiếu (adjustmentCode)
  reason: string | null;    // loại GD / lý do điều chỉnh
  counterName: string | null;
  note: string | null;
}

export interface StockMovementParams {
  productId: string;
  branchId?: string;        // giới hạn theo chi nhánh của dòng
  fromDate: string;
  toDate: string;
}

// ─── Báo cáo doanh thu (GET /api/reports/revenue) ─────────────────────────────

export type RevenuePeriod = 'week' | 'month' | 'year'

export interface RevenueBreakdownRow {
  label: string             // ngày (week/month) hoặc tháng (year)
  doanhThuBan: number
  chiPhiMua: number
  doanhThuDoi: number
  laiGop: number
  soHoaDon: number
  soGiaoDichTrade: number
}

export interface RevenueReport {
  periodLabel: string       // "Tháng 6/2026" | "09/06 - 15/06/2026" | "Năm 2026"
  from: string
  to: string
  totalDoanhThuBan: number
  totalChiPhiMua: number
  totalDoanhThuDoi: number
  totalLaiGop: number
  totalHoaDon: number
  totalGiaoDichTrade: number
  breakdown: RevenueBreakdownRow[]
}

export interface RevenueReportParams {
  branchId: string          // bắt buộc
  period?: RevenuePeriod    // default: month
  date?: string             // ngày bất kỳ trong kỳ — default: hôm nay
}

// ─── Báo cáo đổi ngoại tệ (GET /api/reports/currency-exchange) ────────────────

export interface CurrencyExchangeBalanceRow {
  currencyCode: string
  openingBalance: number
  totalIn: number
  totalOut: number
  closingBalance: number
}

export interface CurrencyExchangeTx {
  id: string
  invoiceCode: string
  transactedAt: string
  customerName: string | null
  sourceCurrency: string
  sourceAmount: number
  targetCurrency: string
  targetAmount: number
  displayRate: number
  counterName: string
  counterId: string
  branchName: string
  branchId: string
  cashierName: string
  status: string
}

export interface CurrencyExchangeReport {
  from: string
  to: string
  branchId: string | null
  counterId: string | null
  balanceSummary: CurrencyExchangeBalanceRow[]
  totalTransactions: number
  transactions: {
    data: CurrencyExchangeTx[]
    pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
  }
}

export interface CurrencyExchangeReportParams {
  from?: string
  to?: string
  branchId?: string
  counterId?: string
  page?: number
  pageSize?: number
}
