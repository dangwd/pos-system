/**
 * types/config.ts — khớp với API docs/api-config.md
 */

// ─── Bảng giá vàng / bạc ────────────────────────────────────────────────────

/** Một hàng trong bảng giá (theo hàm lượng × đơn vị) */
export interface PriceItem {
  goldPurityId: string
  purityCode: string
  hamLuong: number
  category: 'Gold' | 'Silver'
  weightUnitId: string       // FK → WeightUnit
  weightUnitCode: string     // "chi", "bath", "gram", ...
  gramPerUnit: number        // Hệ số quy đổi
  buyPrice: number           // Giá mua vào (LAK/đơn vị)
  sellPrice: number          // Giá bán ra (LAK/đơn vị)
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

/** POST /api/config/prices — item trong request body (1 hàm lượng × 1 đơn vị) */
export interface PriceItemDto {
  goldPurityId: string
  weightUnitId: string  // ID đơn vị (Chỉ/Bath/Lượng/Gram)
  buyPrice: number      // Giá mua vào (LAK/đơn vị)
  sellPrice: number     // Giá bán ra (LAK/đơn vị)
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
  category?: 'Gold' | 'Silver'  // optional — backend có thể trả về hoặc không
}

/** POST /api/config/gold-purities */
export interface CreateGoldPurityDto {
  ma: string
  hamLuong: number
  category?: 'Gold' | 'Silver'
}

/** PUT /api/config/gold-purities/{id} */
export interface UpdateGoldPurityDto {
  ma: string
  hamLuong: number
  category?: 'Gold' | 'Silver'
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
