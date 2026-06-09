/**
 * types/customer.ts
 *
 * Khớp với response của:
 *   GET  /api/customers
 *   GET  /api/customers/{id}
 *   POST /api/customers
 */

// ─── Tier tích điểm ───────────────────────────────────────────────────────────

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

// ─── Entity ───────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  phoneNumber: string
  loyaltyTier: LoyaltyTier | null
  accumulatedPoints: number
  isActive: boolean
  createdAt: string  // ISO 8601
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

/** POST /api/customers */
export interface CreateCustomerDto {
  name: string
  phoneNumber: string
  loyaltyTier?: LoyaltyTier
}

/** Query params cho GET /api/customers */
export interface CustomerSearchParams {
  q?: string     // Tìm theo tên hoặc SĐT
  limit?: number // Mặc định 10
}
