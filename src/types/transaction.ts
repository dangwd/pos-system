/**
 * types/transaction.ts
 *
 * Khớp với response của:
 *   POST /api/transactions
 *   GET  /api/transactions
 *   GET  /api/transactions/{id}
 *   POST /api/transactions/{id}/approve
 *   POST /api/transactions/{id}/reject
 *   POST /api/transactions/{id}/complete
 *
 * State machine: PENDING → APPROVED → COMPLETED
 *                        ↘ REJECTED
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Loại nghiệp vụ giao dịch */
export type TransactionType =
  | 'SellGold'         // Bán vàng
  | 'SellSilver'       // Bán bạc
  | 'BuyGold'          // Mua vào từ khách
  | 'ExchangeGold'     // Đổi hàng / Thu đổi vàng
  | 'ExchangeCurrency' // Thu đổi ngoại tệ

/** Trạng thái giao dịch */
export type TransactionStatus =
  | 'Pending'    // Chờ duyệt
  | 'Approved'   // Đã duyệt
  | 'Completed'  // Hoàn tất — bất biến
  | 'Rejected'   // Bị từ chối

/** Phương thức thanh toán */
export type PaymentMethod = 'CASH' | 'BANK' | 'MIXED'

// ─── Entities (response từ API) ───────────────────────────────────────────────

/** Một dòng hàng trong giao dịch (response) */
export interface TransactionItem {
  id: string
  productSnapshotName: string  // Tên tại thời điểm GD (snapshot — không đổi theo SP)
  quantity: number
  weightUnitName: string       // Tên đơn vị tính ("Chỉ", "Bath", ...)
  weightGram: number           // Tổng gram = qty × unit.gramPerUnit (hoặc override)
  unitPriceLak: number         // Giá snapshot tại thời điểm GD (LAK/gram)
  lineTotal: number            // weightGram × unitPriceLak
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
  branchName: string
  counterName: string
  cashierName: string
  totalAmount: number
  transactedAt: string    // ISO 8601
  items: TransactionItem[]
  // Optional — có thể có trong detail view
  customer?: TransactionCustomer | null
  paymentMethod?: PaymentMethod | null
  note?: string | null
}

/** Kết quả tạo giao dịch (POST /api/transactions response) */
export interface CreateTransactionResult {
  id: string
  invoiceCode: string
  status: TransactionStatus
}

// ─── DTOs (gửi lên API) ───────────────────────────────────────────────────────

/**
 * Một dòng hàng khi tạo giao dịch.
 * unitPriceLakPerGram phải là giá snapshot — lấy từ GET /api/config/prices trước khi submit.
 * weightGramOverride: bắt buộc cho sản phẩm CanThucTe, null cho NguyenKhoi.
 */
export interface CreateTransactionItemDto {
  productId: string
  productName: string          // Snapshot tên sản phẩm tại thời điểm lập đơn
  quantity: number
  weightUnitId: string         // ID từ GET /api/config/weight-units
  weightGramOverride: number | null  // Bắt buộc khi CanThucTe, null khi NguyenKhoi
  unitPriceLakPerGram: number  // Giá snapshot (LAK/gram)
  itemRole: string             // 'Normal' | ...
  laborFee: number             // Phí gia công thợ (₭)
  stoneFee: number             // Phí đá đính kèm (₭)
}

/** POST /api/transactions — Tạo giao dịch mới */
export interface CreateTransactionDto {
  type: TransactionType
  branchId: string
  staffId: string
  counterId: string
  customerId?: string
  items: CreateTransactionItemDto[]
  laborFee?: number
  stoneFee?: number
  paymentMethod: PaymentMethod
  currency?: string | null     // null = LAK
  exchangeRate?: number | null // null khi thanh toán LAK
  note?: string
  depositAmount?: number
}

/** POST /api/transactions/{id}/complete */
export interface CompleteTransactionDto {
  paymentMethod: PaymentMethod
}

/** POST /api/transactions/{id}/approve */
export interface ApproveTransactionDto {
  approvedBy: string
}

/** POST /api/transactions/{id}/reject */
export interface RejectTransactionDto {
  rejectedBy: string
  reason: string
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
  from?: string        // ISO 8601
  to?: string          // ISO 8601
  invoiceCode?: string // Tìm chính xác theo mã hóa đơn
  q?: string           // Tìm tổng quát (tên KH, SĐT, mã GD)
  page?: number
  pageSize?: number
}
