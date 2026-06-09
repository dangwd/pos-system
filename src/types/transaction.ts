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
 * State machine: DRAFT → PENDING → APPROVED → COMPLETED
 *                                ↘ REJECTED
 *
 * Quan trọng: COMPLETED là bất biến — không sửa/xóa, chỉ tạo đảo phiếu.
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
  | 'DRAFT'      // Đang soạn
  | 'PENDING'    // Chờ duyệt (vượt hạn mức hoặc liên chi nhánh)
  | 'APPROVED'   // Đã duyệt
  | 'COMPLETED'  // Hoàn tất — bất biến
  | 'REJECTED'   // Bị từ chối

/** Phương thức thanh toán */
export type PaymentMethod = 'Cash' | 'BankTransfer' | 'QR'

// ─── Entities (response từ API) ───────────────────────────────────────────────

/** Một dòng hàng trong giao dịch */
export interface TransactionItem {
  id: string
  productName: string    // Tên tại thời điểm GD (snapshot — không đổi theo SP)
  quantity: number
  unitPrice: number      // Giá snapshot tại thời điểm GD (₭)
  laborFee: number       // Phí gia công thợ (₭)
  stoneFee: number       // Phí đá đính kèm (₭)
  totalAmount: number    // unitPrice * quantity + laborFee + stoneFee
}

/** Thông tin khách hàng rút gọn trong transaction */
export interface TransactionCustomer {
  id: string
  name: string
  phoneNumber: string
}

/** Giao dịch đầy đủ (GET /api/transactions/{id}) */
export interface Transaction {
  id: string
  invoiceCode: string
  branchId: string
  transactionType: TransactionType
  status: TransactionStatus
  customer: TransactionCustomer | null
  items: TransactionItem[]
  totalAmount: number
  paymentMethod: PaymentMethod | null
  note: string | null
  createdAt: string    // ISO 8601
  completedAt: string | null
}

/** Kết quả tạo giao dịch (POST /api/transactions response) */
export interface CreateTransactionResult {
  id: string
  invoiceCode: string
  status: TransactionStatus  // PENDING hoặc APPROVED tuỳ theo hạn mức
}

// ─── DTOs (gửi lên API) ───────────────────────────────────────────────────────

/**
 * Một dòng hàng khi tạo giao dịch.
 * unitPrice phải là giá snapshot — lấy từ GET /api/config/prices trước khi submit.
 */
export interface CreateTransactionItemDto {
  inventoryItemId: string  // ID từ Inventory (bắt buộc — backend validate tồn kho)
  productId: string
  quantity: number
  unitPrice: number        // Giá snapshot tại thời điểm lập đơn (₭)
  laborFee: number         // Phí gia công (nhân viên nhập tay)
  stoneFee: number         // Phí đá đính kèm (nhân viên nhập tay)
}

/** POST /api/transactions — Tạo giao dịch mới */
export interface CreateTransactionDto {
  branchId: string
  counterId: string
  transactionType: TransactionType
  customerId?: string
  items: CreateTransactionItemDto[]
  note?: string
  referenceInvoiceCode?: string | null  // Dùng cho giao dịch đảo phiếu
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

/** Response phân trang cho GET /api/transactions */
export interface TransactionPage {
  total: number
  page: number
  pageSize: number
  data: Transaction[]
}

/** Query params cho GET /api/transactions */
export interface TransactionListParams {
  branchId?: string
  status?: TransactionStatus
  type?: TransactionType
  from?: string        // yyyy-MM-dd
  to?: string          // yyyy-MM-dd
  invoiceCode?: string // Tìm chính xác
  q?: string           // Tìm tổng quát (tên KH, SĐT)
  page?: number
  pageSize?: number
}
