/**
 * types/transaction.ts
 *
 * Khớp với response của:
 *   POST /api/transactions           → Completed ngay lập tức (trả GUID)
 *   GET  /api/transactions           → danh sách (flat hoặc paged tuỳ có limit/page)
 *   GET  /api/transactions/{id}      → chi tiết
 *   POST /api/transactions/{id}/cancel
 *
 * State machine: POST → Completed → (cancel) → Cancelled
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Loại nghiệp vụ giao dịch */
export type TransactionType =
  | 'SellGold'          // Bán vàng
  | 'SellSilver'        // Bán bạc
  | 'BuyGold'           // Mua vào từ khách
  | 'ExchangeGold'      // Thu đổi vàng cũ
  | 'ExchangeCurrency'  // Thu đổi ngoại tệ
  | 'BuyMoreGold'       // Mua thêm / trade-up
  | 'ExchangeFree'      // Đổi miễn phí (≤ 31 ngày)
  | 'ExchangeToMoney'   // Đổi thành tiền mặt

/** Trạng thái giao dịch — chỉ 2 trạng thái */
export type TransactionStatus =
  | 'Completed'   // Hoàn tất — bất biến (trừ cancel)
  | 'Cancelled'   // Đã hủy — bất biến

/** Phương thức thanh toán */
export type PaymentMethod = 'CASH' | 'BANK' | 'COMBINED'

// ─── Entities (response từ API) ───────────────────────────────────────────────

/** Một dòng hàng trong giao dịch (response) */
export interface TransactionItem {
  id: string
  productId?: string           // ID sản phẩm gốc — dùng khi load ExchangeIn từ HĐ cũ
  productSnapshotName: string  // Tên tại thời điểm GD (snapshot — không đổi theo SP)
  quantity: number
  weightUnitId?: string        // FK → WeightUnit
  weightUnitName: string       // Snapshot tên đơn vị ("Chỉ", "Bath", ...)
  weightGram: number           // Tổng gram = qty × unit.gramPerUnit (hoặc override)
  unitPriceLak: number         // Giá snapshot tại thời điểm GD (LAK/đơn vị)
  tableUnitPriceLak: number    // Giá bảng hiển thị (dùng cho in phiếu)
  lineTotal: number            // quantity × unitPriceLak
  itemRole: 'Normal' | 'ExchangeIn'
  laborFee: number             // Phí gia công
  stoneFee: number             // Phí đá
}

/** Thông tin khách hàng rút gọn trong transaction */
export interface TransactionCustomer {
  id: string
  name: string
  phoneNumber: string
}

/** Giao dịch (GET /api/transactions — list + detail) */
export interface Transaction {
  id: string
  invoiceCode: string
  type: TransactionType
  status: TransactionStatus
  branchId: string
  branchName: string
  counterId: string
  counterName: string
  cashierId: string
  cashierName: string
  subtotalAmount: number
  laborFee: number
  stoneFee: number
  totalAmount: number
  currency: string
  paymentMethod: PaymentMethod
  cashAmount: number | null    // Số tiền mặt (khi COMBINED)
  bankAmount: number | null    // Số tiền chuyển khoản (khi COMBINED)
  note: string | null
  transactedAt: string         // ISO 8601
  referenceInvoiceCode: string | null
  cancelReason: string | null
  cancelledAt: string | null
  customer: TransactionCustomer | null
  items: TransactionItem[]
}

// ─── DTOs (gửi lên API) ───────────────────────────────────────────────────────

/** Vai trò của một dòng hàng */
export type ItemRole = 'Normal' | 'ExchangeIn'

/** Một dòng hàng khi tạo giao dịch */
export interface CreateTransactionItemDto {
  productId: string
  productName: string                // Snapshot tên sản phẩm
  quantity: number
  weightUnitId?: string | null       // null khi ExchangeCurrency
  weightGramOverride?: number | null // Bắt buộc cho CanThucTe; null/omit cho NguyenKhoi
  unitPriceLak: number               // Giá snapshot (LAK/đơn vị)
  itemRole: ItemRole
  laborFee: number                   // Phí gia công thợ (₭)
  stoneFee: number                   // Phí đá đính kèm (₭)
  haoHutGram: number                 // Hao hụt trọng lượng (gram) — LAO SUT
  phiHuHai: number                   // Phí hủy hoại (₭) — PHÍ KHÒ cho ExchangeIn
}

/** POST /api/transactions — Tạo giao dịch mới */
export interface CreateTransactionDto {
  type: TransactionType
  // branchId / staffId / counterId KHÔNG gửi — backend lấy từ JWT
  customerId?: string
  items: CreateTransactionItemDto[]
  paymentMethod: PaymentMethod
  cashAmount?: number | null         // Bắt buộc khi COMBINED
  bankAmount?: number | null         // Bắt buộc khi COMBINED
  currency?: string | null           // null = LAK
  exchangeRate?: number | null       // null khi LAK
  note?: string
  referenceInvoiceCode?: string      // Mã HĐ vàng cũ liên kết (ExchangeGold)
}

/** POST /api/transactions/{id}/cancel */
export interface CancelTransactionDto {
  reason?: string
}

// ─── Phân trang ───────────────────────────────────────────────────────────────

import type { PagedResult } from './common'

/** Response phân trang cho GET /api/transactions?page=N */
export type TransactionPage = PagedResult<Transaction>

/** Query params cho GET /api/transactions */
export interface TransactionListParams {
  branchId?: string
  status?: TransactionStatus
  type?: TransactionType
  from?: string         // ISO 8601
  to?: string           // ISO 8601
  invoiceCode?: string  // Tìm chính xác theo mã HĐ
  q?: string            // Tìm tổng quát
  /** Chế độ flat-array (POS lookup) — khi truyền `limit`, bỏ qua `page`/`pageSize` */
  limit?: number
  page?: number
  pageSize?: number
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}
