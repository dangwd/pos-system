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

/** GET /api/config/exchange-rates  |  GET /api/config/exchange-rates/history */
export interface ExchangeRate {
  id: string
  currencyCode: string   // "THB", "USD"
  rateToLak: number
  adjustment: number
  effectiveRate: number  // = rateToLak + adjustment — tỷ giá thực áp dụng
  updatedBy?: string     // UUID người cập nhật
  updatedAt?: string     // ISO 8601
  effectiveFrom: string
}

/** POST /api/config/exchange-rates */
export interface UpdateExchangeRateDto {
  currencyCode: string
  rateToLak: number
  adjustment: number
}

/** POST /api/config/exchange-rates/bulk */
export interface BulkUpdateExchangeRatesRequest {
  items: UpdateExchangeRateDto[]
}

// ─── Lịch sử tỷ giá LAK theo phiên ──────────────────────────────────────────

/** Một loại ngoại tệ trong một phiên cập nhật tỷ giá LAK */
export interface ExchangeRateSessionItem {
  currencyCode: string
  rateToLak: number
  adjustment: number
  effectiveRate: number  // = rateToLak + adjustment
}

/** Một phiên thay đổi tỷ giá LAK (GET /api/config/exchange-rates/history) */
export interface ExchangeRateSession {
  sessionId: string | null
  updatedBy: string
  updatedAt: string
  items: ExchangeRateSessionItem[]
}

// ─── Rate Graph — cặp tỷ giá (exchange_rate_pairs) ──────────────────────────

/**
 * Một cặp tỷ giá trong Rate Graph: 1 from = rate to.
 * GET /api/config/exchange-rate-pairs (+ ?from=) | response của PUT & POST /bulk.
 */
export interface ExchangeRatePair {
  from: string
  to: string
  rate: number
  isComputed: boolean        // true = cross-rate tính qua LAK, không lưu trực tiếp
  updatedBy: string | null   // null khi isComputed
  updatedAt: string | null   // null khi isComputed
}

/** PUT /api/config/exchange-rate-pairs/{from}/{to} */
export interface UpdateExchangeRatePairDto {
  rate: number
}

/** Một item trong bulk upsert cặp tỷ giá */
export interface ExchangeRatePairBulkItem {
  from: string
  to: string
  rate: number
}

/** POST /api/config/exchange-rate-pairs/bulk */
export interface BulkUpdateExchangeRatePairsRequest {
  items: ExchangeRatePairBulkItem[]
}

// ─── Rate Graph — lịch sử cặp tỷ giá ────────────────────────────────────────

/** Một cặp tỷ giá trong log: 1 from = rate to */
export interface ExchangeRatePairLogItem {
  from: string
  to: string
  rate: number
}

/** Một phiên thay đổi cặp tỷ giá (GET /api/config/exchange-rate-pairs/history) */
export interface ExchangeRatePairSession {
  sessionId: string | null
  updatedBy: string
  updatedAt: string
  items: ExchangeRatePairLogItem[]
}

/** Tham số lọc + phân trang dùng chung cho hai endpoint history */
export interface ExchangeHistoryQuery {
  page?: number
  pageSize?: number
  fromDate?: string  // ISO 8601
  toDate?: string    // ISO 8601
  currency?: string  // mã tiền tệ, ví dụ "USD"
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

/** { value: number } — một mệnh giá tiền tệ */
export interface CurrencyDenomination {
  value: number
}

/** GET /api/currencies */
export interface Currency {
  id: string
  code: string      // ISO 4217, viết hoa, bất biến sau khi tạo
  name: string
  symbol: string
  flag?: string     // Emoji cờ quốc gia, e.g. "🇺🇸", "🇹🇭"
  isActive: boolean
  sortOrder: number
  denominations: CurrencyDenomination[]
}

/** POST /api/currencies */
export interface CreateCurrencyDto {
  code: string
  name: string
  symbol: string
  flag?: string
  sortOrder: number
  isActive?: boolean
  denominations?: number[]
}

/** PUT /api/currencies/{id} — code không được phép thay đổi */
export interface UpdateCurrencyDto {
  name: string
  symbol: string
  flag?: string
  isActive: boolean
  sortOrder: number
  denominations?: number[]
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

// ─── Cấu hình hệ thống (SystemConfig) ────────────────────────────────────────

/**
 * GET /api/config/system — tham số nghiệp vụ chỉnh tại runtime (append-only).
 * `updatedAt`/`updatedBy` = null khi DB chưa có bản ghi (trả mặc định tích hợp).
 */
export interface SystemConfig {
  exchangeFreeEnabled: boolean
  exchangeFreeMaxDays: number
  buyBackOriginalPriceEnabled: boolean
  buyBackOriginalPriceMaxDays: number  // 0 = không giới hạn
  updatedAt: string | null
  updatedBy: string | null
}

/** PUT /api/config/system/exchange-free */
export interface UpdateExchangeFreeSettingsDto {
  isEnabled: boolean
  maxDays: number   // phải > 0
}

/** PUT /api/config/system/buy-back-original-price */
export interface UpdateBuyBackOriginalPriceSettingsDto {
  isEnabled: boolean
  maxDays: number   // >= 0 (0 = không giới hạn)
}
