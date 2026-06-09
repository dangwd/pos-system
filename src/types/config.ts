/**
 * types/config.ts
 *
 * Khớp với response của:
 *   GET  /api/config/prices
 *   POST /api/config/prices
 *   GET  /api/config/exchange-rates
 *   POST /api/config/exchange-rates
 *   GET  /api/config/stone-price-rules
 *   POST /api/config/stone-price-rules
 *   GET  /api/config/weight-units
 *   GET  /api/config/gold-purities
 */

// ─── Bảng giá vàng/bạc ────────────────────────────────────────────────────────

/**
 * GET /api/config/prices — Bảng giá hiện hành.
 * Mỗi lần cập nhật tạo bản ghi mới (không ghi đè) để giữ lịch sử.
 */
export interface PriceConfig {
  id: string
  goldBuyPricePerChi: number    // Giá mua vào / chỉ (₭)
  goldSellPricePerChi: number   // Giá bán ra / chỉ (₭)
  silverPricePerGram: number    // Giá bạc / gram (₭)
  effectiveFrom: string         // ISO 8601 — thời điểm có hiệu lực
  updatedBy: string             // Mã nhân viên cập nhật
}

/** POST /api/config/prices */
export interface UpdatePriceConfigDto {
  goldBuyPricePerChi: number
  goldSellPricePerChi: number
  silverPricePerGram: number
}

// ─── Tỷ giá ngoại tệ ─────────────────────────────────────────────────────────

/** GET /api/config/exchange-rates — danh sách tỷ giá hiện hành */
export interface ExchangeRate {
  id: string
  currencyCode: string     // "THB", "USD", ...
  rateToLak: number        // 1 ngoại tệ = X LAK
  adjustment: number       // Spread cộng thêm (điều chỉnh)
  effectiveFrom: string    // ISO 8601
}

/** POST /api/config/exchange-rates */
export interface UpdateExchangeRateDto {
  currencyCode: string
  rateToLak: number
  adjustment: number
}

// ─── Quy tắc giá đá đính kèm ─────────────────────────────────────────────────

/**
 * GET /api/config/stone-price-rules
 * Phí đá phụ thuộc vào trọng lượng vàng mua — tra bảng này để lấy giá đá.
 */
export interface StonePriceRule {
  id: string
  tuSoChi: number    // Trọng lượng từ (chỉ)
  denSoChi: number   // Trọng lượng đến (chỉ)
  giaDa: number      // Phí đá trong khoảng này (₭)
}

/** POST /api/config/stone-price-rules */
export interface CreateStonePriceRuleDto {
  tuSoChi: number
  denSoChi: number
  giaDa: number
}

// ─── Đơn vị trọng lượng ──────────────────────────────────────────────────────

/** GET /api/config/weight-units */
export interface WeightUnit {
  maTocDoc: string     // "chi", "luong", "cay"
  tenDonVi: string     // "Chỉ", "Lượng", "Cây"
  gramPerUnit: number  // Hệ số quy đổi sang gram
}

// ─── Độ tinh khiết vàng ───────────────────────────────────────────────────────

/** GET /api/config/gold-purities */
export interface GoldPurity {
  id: string
  ma: string          // "9999", "24K", "18K", "22K"
  hamLuong: number    // Phần trăm vàng nguyên chất
}

/** POST /api/config/gold-purities */
export interface CreateGoldPurityDto {
  ma: string
  hamLuong: number
}
