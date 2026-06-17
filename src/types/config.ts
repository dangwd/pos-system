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
 * GET /api/config/prices — bảng giá hiện hành (đọc-only).
 * POS & Inventory snapshot giá từ đây cho tới khi migrate sang model nhiều bảng.
 */
export interface PriceConfig {
  id: string
  effectiveFrom: string  // ISO 8601
  updatedBy: string      // GUID người cập nhật
  updatedAt: string      // ISO 8601
  items: PriceItem[]
}

// ─── Bảng giá (nhiều bảng song song) ─────────────────────────────────────────

export interface PriceRow {
  karat: string           // '9999' | '999' | '750' | '585' | '375' | '925' | '800'
  type: 'gold' | 'silver'
  unit: string            // 'chi' | 'gram'
  gramPerUnit: number     // Hệ số quy đổi (chi=3.75, gram=1) — snapshot lúc tạo bảng
  buy: number
  sell: number
}

export type PriceTableScope = 'all' | 'branch'

export interface PriceTable {
  id: string
  name: string
  scope: PriceTableScope
  branches: string[]
  active: boolean
  createdAt: string
  createdBy: string
  createdById: string
  updatedAt: string
  updatedBy: string
  prices: PriceRow[]
}

export interface CreatePriceTableDto {
  name: string
  scope: PriceTableScope
  branches: string[]
  prices: PriceRow[]
}

export interface TogglePriceTableActiveDto {
  active: boolean
}

// ─── Tỷ giá ngoại tệ ─────────────────────────────────────────────────────────

/** GET /api/config/exchange-rates */
export interface ExchangeRate {
  id: string
  currencyCode: string   // "THB", "USD"
  rateToLak: number
  adjustment: number
  effectiveRate: number  // = rateToLak + adjustment — tỷ giá thực áp dụng
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

// ─── Currencies — Ngoại tệ ────────────────────────────────────────────────────

/** GET /api/currencies */
export interface Currency {
  id: string
  code: string      // ISO 4217, viết hoa, bất biến sau khi tạo
  name: string
  symbol: string
  flag?: string     // Emoji cờ quốc gia, e.g. "🇺🇸", "🇹🇭"
  isActive: boolean
  sortOrder: number
}

/** POST /api/currencies */
export interface CreateCurrencyDto {
  code: string
  name: string
  symbol: string
  flag?: string
  sortOrder: number
  isActive?: boolean
}

/** PUT /api/currencies/{id} — code không được phép thay đổi */
export interface UpdateCurrencyDto {
  name: string
  symbol: string
  flag?: string
  isActive: boolean
  sortOrder: number
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

/** POST /api/config/roles */
export interface CreateRoleDto {
  code: string
  name: string
  description: string
}

/** PUT /api/config/roles/{roleId} */
export interface UpdateRoleDto {
  name: string
  description: string
}
