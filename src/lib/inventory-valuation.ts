/**
 * lib/inventory-valuation.ts — Định giá tồn kho (pure functions)
 *
 * Quy đổi & định giá mục kho dựa trên bảng giá hiện hành (PriceConfig) và
 * tỷ giá ngoại tệ (ExchangeRate). Không side-effect, không gọi API.
 *
 * NGHIỆP VỤ (đã chốt theo "Tài liệu Nghiệp vụ & Luồng Quy trình" §9.2 — đối
 * chiếu code backend): `InventoryItem.weightGram` là **TỔNG trọng lượng cả lô**
 * (= trọng lượng mỗi món × số lượng). Do đó:
 *   - "Định lượng quy chuẩn" (mỗi món) = (weightGram / quantity) quy ra Chỉ
 *   - "Đơn giá bán lẻ" (mỗi món)        = giá trị 1 món theo giá bán
 *   - "Lô" (giá trị tồn của mục)         = (weightGram / đơn vị) × giá bán
 *                                        = đơn giá bán lẻ × quantity
 *   - Tổng tồn vàng/bạc = Σ trọng lượng từng mục (KHÔNG nhân lại quantity).
 */

import type { InventoryItem } from '@/types/inventory'
import type { PriceConfig, PriceItem, ExchangeRate } from '@/types/config'

/** 1 Chỉ = 3.75 gram */
export const GRAM_PER_CHI = 3.75

/** Quy đổi gram → chỉ */
export function gramToChi(gram: number, gramPerChi: number = GRAM_PER_CHI): number {
  return gram / gramPerChi
}

/** Tìm dòng giá khớp hàm lượng (purityCode). Ưu tiên đơn vị `preferUnit` nếu có. */
export function findPriceItem(
  config: PriceConfig | undefined,
  purity: string,
  preferUnit?: string,
): PriceItem | undefined {
  if (!config) return undefined
  const matches = config.items.filter(it => it.purityCode === purity)
  if (matches.length === 0) return undefined
  if (preferUnit) {
    const exact = matches.find(it => it.weightUnitCode === preferUnit)
    if (exact) return exact
  }
  return matches[0]
}

export interface ItemValuation {
  category: 'Gold' | 'Silver' | 'Other'
  /** Trọng lượng mỗi món (gram) = weightGram / quantity */
  perPieceGram: number
  /** Trọng lượng mỗi món quy ra Chỉ — cột "Định lượng quy chuẩn" */
  chiPerUnit: number
  /** Mã đơn vị tính giá ('chi' | 'gram' | ...) hoặc null nếu chưa có giá */
  unitCode: string | null
  /** Giá bán / đơn vị (LAK) từ bảng giá, null nếu chưa cấu hình */
  sellPerUnit: number | null
  /** Giá trị 1 món theo trọng lượng (LAK) — cột "Đơn giá bán lẻ" */
  retailUnitPrice: number
  /** Giá trị toàn bộ tồn của mục kho (LAK) — cột "Lô" = (weightGram / đơn vị) × giá bán */
  lotValue: number
}

/**
 * Định giá một mục kho theo bảng giá hiện hành.
 * weightGram là TỔNG cả lô (§9.2) → "Lô" dùng thẳng weightGram, "mỗi món" chia quantity.
 */
export function valuateItem(item: InventoryItem, config: PriceConfig | undefined): ItemValuation {
  const qty = item.quantity > 0 ? item.quantity : 1
  const perPieceGram = item.weightGram / qty
  const chiPerUnit = gramToChi(perPieceGram)

  // Vàng tính theo Chỉ, bạc theo gram — fallback dòng giá đầu tiên khớp purity.
  const priceItem =
    findPriceItem(config, item.purity, 'chi') ?? findPriceItem(config, item.purity, 'gram')

  if (!priceItem) {
    return {
      category: 'Other',
      perPieceGram,
      chiPerUnit,
      unitCode: null,
      sellPerUnit: null,
      retailUnitPrice: 0,
      lotValue: 0,
    }
  }

  // Giá trị cả lô tính trực tiếp từ TỔNG trọng lượng; đơn giá/món = lô / số lượng.
  const lotUnits = priceItem.gramPerUnit > 0 ? item.weightGram / priceItem.gramPerUnit : 0
  const lotValue = Math.round(lotUnits * priceItem.sellPrice)
  const retailUnitPrice = item.quantity > 0 ? Math.round(lotValue / item.quantity) : lotValue

  return {
    category: priceItem.category,
    perPieceGram,
    chiPerUnit,
    unitCode: priceItem.weightUnitCode,
    sellPerUnit: priceItem.sellPrice,
    retailUnitPrice,
    lotValue,
  }
}

export interface InventoryTotals {
  goldStockChi: number       // Σ (TỔNG chỉ) của hàng vàng
  silverStockGram: number    // Σ (TỔNG gram) của hàng bạc
  totalAssetLak: number      // Σ lotValue tất cả mục
}

/** Tổng hợp số liệu tồn kho cho các thẻ summary. weightGram đã là TỔNG cả lô. */
export function summarizeInventory(
  items: InventoryItem[],
  config: PriceConfig | undefined,
): InventoryTotals {
  let goldStockChi = 0
  let silverStockGram = 0
  let totalAssetLak = 0

  for (const item of items) {
    const v = valuateItem(item, config)
    totalAssetLak += v.lotValue
    if (v.category === 'Gold') {
      goldStockChi += gramToChi(item.weightGram)
    } else if (v.category === 'Silver') {
      silverStockGram += item.weightGram
    }
  }

  return { goldStockChi, silverStockGram, totalAssetLak }
}

export interface ProductPriceEstimate {
  metalValue: number   // Giá phần kim loại = chi × giá bán/Chỉ
  laborFee: number     // Tiền công
  stoneFee: number     // Phụ phí đá
  total: number        // Ước giá bán ra = metal + công + đá
}

/**
 * Ước tính giá bán ra cho sản phẩm khi khai báo (live preview).
 * @param chi        Khối lượng quy chuẩn (chỉ)
 * @param sellPerChi Giá bán / chỉ theo hàm lượng (LAK)
 */
export function estimateProductSellPrice(
  chi: number,
  sellPerChi: number,
  laborFee: number,
  stoneFee: number,
): ProductPriceEstimate {
  const metalValue = Math.round(chi * sellPerChi)
  return { metalValue, laborFee, stoneFee, total: metalValue + laborFee + stoneFee }
}

/**
 * Quy đổi LAK → ngoại tệ theo tỷ giá (rateToLak = số LAK cho 1 ngoại tệ).
 * Trả về `null` khi chưa cấu hình tỷ giá → UI hiển thị "N/A" thay vì 0.
 */
export function lakToForeign(lak: number, rate: ExchangeRate | undefined): number | null {
  if (!rate || rate.rateToLak <= 0) return null
  return lak / rate.rateToLak
}

/** Tìm tỷ giá theo mã ngoại tệ (THB/USD). */
export function findRate(rates: ExchangeRate[] | undefined, code: string): ExchangeRate | undefined {
  return rates?.find(r => r.currencyCode === code)
}
