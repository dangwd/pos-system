/**
 * types/customer.ts
 *
 * Khớp với response của:
 *   GET  /api/customers
 *   GET  /api/customers/{id}
 *   POST /api/customers
 */

// ─── Tier tích điểm ───────────────────────────────────────────────────────────

export type LoyaltyTier = 'silver' | 'gold' | 'platinum'

// ─── Entities ─────────────────────────────────────────────────────────────────

/** GET /api/customers (list) — dùng cho dropdown / danh sách */
export interface CustomerSummary {
  id: string
  name: string
  phoneNumber: string
  email: string | null
  loyaltyTier: LoyaltyTier | null
  accumulatedPoints: number
  isActive: boolean
  createdAt: string  // ISO 8601
}

/** GET /api/customers/{id} — chi tiết, kèm address / dateOfBirth / totalCompletedInvoices */
export interface CustomerDetail extends CustomerSummary {
  address: string | null
  dateOfBirth: string | null  // YYYY-MM-DD
  totalCompletedInvoices: number
}

/** Alias cho tương thích ngược — ưu tiên dùng CustomerSummary / CustomerDetail */
export type Customer = CustomerSummary

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** POST /api/customers */
export interface CreateCustomerDto {
  name: string
  phoneNumber?: string
  email?: string
  address?: string
  dateOfBirth?: string  // YYYY-MM-DD
  loyaltyTier?: LoyaltyTier
}

/** PUT /api/customers/{id} */
export type UpdateCustomerDto = CreateCustomerDto

/** Query params cho GET /api/customers */
export interface CustomerSearchParams {
  search?: string  // Tìm theo tên hoặc SĐT
  q?: string       // Alias cũ của search (tương thích ngược)
  limit?: number   // Chỉ có hiệu lực khi không truyền page (chọn nhanh); mặc định 10 ở lookup mode
  page?: number    // Khi truyền → kích hoạt phân trang
  pageSize?: number
}

/**
 * Query params cho GET /api/customers ở chế độ phân trang (table).
 * Backend Customers hỗ trợ `search` (so khớp tên / SĐT, không phân biệt hoa thường).
 * `page` 1-indexed; `pageSize` mặc định 20.
 */
export interface CustomerListParams {
  search?: string
  page?: number
  pageSize?: number
}
