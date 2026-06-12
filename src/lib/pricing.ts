/**
 * lib/pricing.ts — Công thức tính giá giao dịch
 *
 * Pure functions — không có side effects, không gọi API.
 * Test được độc lập với UI và store.
 *
 * Quy tắc:
 *  - Mọi giá trị tiền tệ = integer LAK (₭) — KHÔNG dùng float
 *  - Dùng Math.round() để làm tròn trước khi trả về
 *  - Tham chiếu giá phải là snapshot tại thời điểm GD
 *
 * Đơn vị trọng lượng: Chỉ (1 chỉ = 3.75 gram = 3750 mg)
 */

import type { StonePriceRule } from '@/types/config'
import type { CartItem } from '@/types/cart'
import { lineTotal } from '@/types/cart'
import type { TransactionType } from '@/types/transaction'

// ─── Helper ────────────────────────────────────────────────────────────────────

/** Quy đổi milligram → chỉ (1 chỉ = 3750 mg) */
export function mgToChi(mg: number): number {
  return mg / 3750
}

/** Quy đổi milligram → gram */
export function mgToGram(mg: number): number {
  return mg / 1000
}

// ─── Bán vàng (SELL_GOLD) ──────────────────────────────────────────────────────

/**
 * Tổng tiền vàng một dòng hàng.
 * @param weightMg   Trọng lượng (milligram)
 * @param pricePerChi  Giá vàng bán ra (₭/chỉ) — snapshot
 */
export function calcGoldLineSell(weightMg: number, pricePerChi: number): number {
  return Math.round(mgToChi(weightMg) * pricePerChi)
}

// ─── Mua vàng (BUY_GOLD) ──────────────────────────────────────────────────────

/**
 * Tiền phải chi khi mua vàng từ khách.
 * Không bao gồm laborFee hay stoneFee.
 */
export function calcGoldBuy(weightMg: number, buyPricePerChi: number): number {
  return Math.round(mgToChi(weightMg) * buyPricePerChi)
}

// ─── Bán bạc (SELL_SILVER) ────────────────────────────────────────────────────

/**
 * Tổng tiền bạc.
 * @param weightMg   Trọng lượng (milligram)
 * @param pricePerGram Giá bạc (₭/gram) — snapshot
 */
export function calcSilverSell(weightMg: number, pricePerGram: number): number {
  return Math.round(mgToGram(weightMg) * pricePerGram)
}

// ─── Phí đá đính kèm ──────────────────────────────────────────────────────────

/**
 * Tra bảng stonePriceRules để lấy phí đá dựa trên trọng lượng vàng mua.
 * Trả về 0 nếu không có quy tắc phù hợp.
 */
export function lookupStoneFee(weightMg: number, rules: StonePriceRule[]): number {
  const chi = mgToChi(weightMg)
  const rule = rules.find(r => chi >= r.tuSoChi && chi <= r.denSoChi)
  return rule?.giaDa ?? 0
}

// ─── Mua thêm / Trade-up (TRADE_UP) ──────────────────────────────────────────

export interface TradeUpParams {
  oldWeightMg: number       // Trọng lượng vàng cũ (mg)
  newWeightMg: number       // Trọng lượng sản phẩm mới (mg)
  wasteWeightMg: number     // Hao hụt trọng lượng (mg)
  sellPricePerChi: number   // Giá bán ra hiện tại (₭/chỉ) — snapshot
  newLaborFee: number       // Phí gia công SP mới (nhân viên nhập)
  newStoneFee: number       // Phí đá SP mới (nhân viên nhập)
  damageFee: number         // Phí hư hại (nhân viên quy định)
}

export interface TradeUpResult {
  oldGoldValue: number   // Giá trị vàng cũ (₭)
  newProductVal: number  // Giá trị SP mới bao gồm phí (₭)
  wasteAmount: number    // Tiền hao hụt (₭)
  customerPays: number   // Tổng khách phải trả thêm (₭) — có thể âm nếu hoàn tiền
}

/**
 * Tính tiền khách phải trả thêm khi mua thêm / trade-up.
 * Dùng giá BÁN RA để định giá vàng cũ (không phải giá mua vào).
 */
export function calcTradeUp(p: TradeUpParams): TradeUpResult {
  const oldGoldValue = Math.round(mgToChi(p.oldWeightMg) * p.sellPricePerChi)
  const baseNewVal = Math.round(mgToChi(p.newWeightMg) * p.sellPricePerChi)
  const newProductVal = baseNewVal + p.newLaborFee + p.newStoneFee
  const wasteAmount = Math.round(mgToChi(p.wasteWeightMg) * p.sellPricePerChi)
  const customerPays = newProductVal - oldGoldValue + p.damageFee + wasteAmount

  return { oldGoldValue, newProductVal, wasteAmount, customerPays }
}

// ─── Đổi hàng khác loại (EXCHANGE_GOLD) ──────────────────────────────────────

export interface ExchangeGoldParams {
  newLaborFee: number      // Phí gia công SP mới
  newStoneFee: number      // Phí đá SP mới
  oldStoneFeeWaived: number // Phí đá SP cũ được miễn (nếu áp dụng chính sách)
  damageFee: number
  wasteWeightMg: number
  sellPricePerChi: number
}

/**
 * Tiền khách phải trả thêm khi đổi sang sản phẩm khác loại.
 * Đổi cùng trọng lượng, cùng loại, không hư hại → customerPays = 0.
 */
export function calcExchangeGold(p: ExchangeGoldParams): number {
  const wasteAmount = Math.round(mgToChi(p.wasteWeightMg) * p.sellPricePerChi)
  return p.newStoneFee + p.newLaborFee + p.damageFee + wasteAmount - p.oldStoneFeeWaived
}

// ─── Đổi thành tiền (PARTIAL_REDEMPTION) ─────────────────────────────────────

export interface PartialRedemptionParams {
  cashPartWeightMg: number   // Trọng lượng phần đổi thành tiền (mg)
  buyPricePerChi: number     // Giá MUA VÀO (₭/chỉ) — snapshot
  newStoneFee: number
  newLaborFee: number
  damageFee: number
}

/**
 * Tiền khách thực nhận khi đổi một phần vàng thành tiền mặt.
 * Phần đổi tiền được định giá theo giá MUA VÀO (không phải bán ra).
 */
export function calcPartialRedemption(p: PartialRedemptionParams): number {
  const cashPartValue = Math.round(mgToChi(p.cashPartWeightMg) * p.buyPricePerChi)
  return cashPartValue - p.newStoneFee - p.newLaborFee - p.damageFee
}

// ─── Thu đổi ngoại tệ (EXCHANGE_CURRENCY) ────────────────────────────────────

/**
 * Số tiền LAK khách nhận khi đổi ngoại tệ.
 * @param foreignAmount Số lượng ngoại tệ
 * @param rate          Tỷ giá (₭/1 ngoại tệ)
 * @param adjustment    Điều chỉnh tỷ giá (spread)
 */
export function calcCurrencyExchange(
  foreignAmount: number,
  rate: number,
  adjustment: number
): number {
  return Math.round(foreignAmount * (rate + adjustment))
}

// ─── Cart totals ───────────────────────────────────────────────────────────────

/**
 * Gross value tất cả items (weight × price, không gồm fees và discount).
 * Dùng cho hiển thị "Tổng hàng" trong SummaryBar.
 */
export function calcSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const totalGram = item.weightGramOverride !== null
      ? item.weightGramOverride : item.qty * item.weightGram
    return sum + Math.round(totalGram * item.unitPriceLakPerGram)
  }, 0)
}

/** Tổng Normal items (hàng bán ra) — dùng cho ExchangeGold/SellGold */
export function calcTotalA(items: CartItem[]): number {
  return items
    .filter(i => i.itemRole === 'Normal')
    .reduce((sum, i) => sum + lineTotal(i), 0)
}

/** Tổng ExchangeIn items (vàng cũ đổi vào, sau khi trừ PHÍ KHÒ/LAO SUT) */
export function calcTotalB(items: CartItem[]): number {
  return items
    .filter(i => i.itemRole === 'ExchangeIn')
    .reduce((sum, i) => sum + lineTotal(i), 0)
}

/**
 * Chênh lệch thanh toán (có dấu).
 *  BuyGold:      âm  → tiệm chi trả khách
 *  ExchangeGold: dương → khách trả thêm; âm → tiệm trả lại khách
 *  SellGold:     luôn dương → khách trả tiệm
 */
export function calcNetTotal(
  items: CartItem[],
  txnType: TransactionType,
  discountAmount: number,
): number {
  const a = calcTotalA(items)
  const b = calcTotalB(items)
  if (txnType === 'BuyGold') return -(a - discountAmount)
  return a - b - discountAmount
}

/**
 * Số tiền thanh toán thực tế (luôn dương).
 * BuyGold:      tiệm trả khách = |netTotal|
 * ExchangeGold: chênh lệch = |netTotal|
 * Các loại còn lại: khách trả tiệm, floor ở 0
 */
export function calcTotal(items: CartItem[], discountAmount: number, txnType?: TransactionType): number {
  if (txnType === 'BuyGold' || txnType === 'ExchangeGold') {
    return Math.abs(calcNetTotal(items, txnType, discountAmount))
  }
  // SellGold / SellSilver / ExchangeCurrency
  return Math.max(0, calcTotalA(items) - discountAmount)
}

/**
 * Lãi gộp tạm tính cho một giao dịch bán vàng.
 * lãi = (tiềnVàng + tiềnĐá + tiềnCông) − (trọngLượng × giáMuaVào)
 */
export function calcGrossProfit(
  goldRevenue: number,
  stoneFee: number,
  laborFee: number,
  totalWeightMg: number,
  buyPricePerChi: number
): number {
  const costOfGoods = Math.round(mgToChi(totalWeightMg) * buyPricePerChi)
  return goldRevenue + stoneFee + laborFee - costOfGoods
}
