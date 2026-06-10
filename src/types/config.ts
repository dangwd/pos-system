/**
 * types/config.ts — khớp với API docs/api-config.md
 */

// ─── Bảng giá vàng / bạc ────────────────────────────────────────────────────

/** Một hàng trong bảng giá (theo hàm lượng) */
export interface PriceItem {
  goldPurityId: string
  purityCode: string
  hamLuong: number
  category: 'Gold' | 'Silver'
  buyPricePerChi: number    // LAK/chỉ — chỉ dùng cho Gold
  sellPricePerChi: number   // LAK/chỉ — chỉ dùng cho Gold
  buyPricePerGram: number   // LAK/gram — chỉ dùng cho Silver
  sellPricePerGram: number  // LAK/gram — chỉ dùng cho Silver
}

/**
 * GET /api/config/prices — bảng giá hiện hành.
 * Mỗi lần cập nhật tạo bản ghi mới (không ghi đè) để giữ lịch sử.
 */
export interface PriceConfig {
  id: string
  effectiveFrom: string  // ISO 8601
  updatedBy: string      // GUID người cập nhật
  updatedAt: string      // ISO 8601
  items: PriceItem[]
}

/** POST /api/config/prices — item trong request body */
export interface PriceItemDto {
  goldPurityId: string
  buyPricePerChi: number
  sellPricePerChi: number
  buyPricePerGram: number
  sellPricePerGram: number
}

/** POST /api/config/prices */
export interface UpdatePriceConfigDto {
  items: PriceItemDto[]
}

// ─── Tỷ giá ngoại tệ ─────────────────────────────────────────────────────────

/** GET /api/config/exchange-rates */
export interface ExchangeRate {
  id: string
  currencyCode: string   // "THB", "USD"
  rateToLak: number
  adjustment: number
  effectiveFrom: string
}

/** POST /api/config/exchange-rates */
export interface UpdateExchangeRateDto {
  currencyCode: string
  rateToLak: number
  adjustment: number
}

// ─── Bảng phí đá đính kèm ────────────────────────────────────────────────────

/** GET /api/config/stone-price-rules */
export interface StonePriceRule {
  id: string
  tuSoChi: number   // từ trọng lượng (chỉ) — inclusive
  denSoChi: number  // đến trọng lượng (chỉ) — exclusive
  giaDa: number     // LAK
}

/** POST /api/config/stone-price-rules */
export interface CreateStonePriceRuleDto {
  tuSoChi: number
  denSoChi: number
  giaDa: number
}

/** PUT /api/config/stone-price-rules/{id} */
export interface UpdateStonePriceRuleDto {
  tuSoChi: number
  denSoChi: number
  giaDa: number
}

// ─── Đơn vị trọng lượng ──────────────────────────────────────────────────────

/** GET /api/config/weight-units */
export interface WeightUnit {
  id: string
  maTocDoc: string    // "chi", "luong", "cay" ...
  tenDonVi: string    // "Chỉ", "Lượng", "Cây" ...
  gramPerUnit: number
  isSystem: boolean   // true = không được xóa
}

/** POST /api/config/weight-units */
export interface CreateWeightUnitDto {
  tenDonVi: string
  maTocDoc: string
  gramPerUnit: number
}

/** PUT /api/config/weight-units/{id} */
export interface UpdateWeightUnitDto {
  tenDonVi: string
  gramPerUnit: number
}

// ─── Hàm lượng vàng / bạc ────────────────────────────────────────────────────

/** GET /api/config/gold-purities */
export interface GoldPurity {
  id: string
  ma: string                    // "9999", "24K", "18K", "925" ...
  hamLuong: number              // phần trăm nguyên chất
  category: 'Gold' | 'Silver'  // quyết định cách tính giá
}

/** POST /api/config/gold-purities */
export interface CreateGoldPurityDto {
  ma: string
  hamLuong: number
  category?: 'Gold' | 'Silver'  // mặc định Gold nếu không truyền
}

/** PUT /api/config/gold-purities/{id} */
export interface UpdateGoldPurityDto {
  ma: string
  hamLuong: number
  category: 'Gold' | 'Silver'
}

// ─── Roles & Permissions ──────────────────────────────────────────────────────

/** GET /api/config/permissions */
export interface Permission {
  id: string
  code: string
  name: string
  group: string
}

/** GET /api/config/roles */
export interface AppRole {
  id: string
  code: string
  name: string
  description: string
  isSystem: boolean
  permissions: Permission[]
}

/** PUT /api/config/roles/{roleId}/permissions */
export interface UpdateRolePermissionsDto {
  permissionIds: string[]
}
