/**
 * lib/price-table-adapter.ts — Adapter: PriceTable (model 2) → PriceConfig (shape nội bộ)
 *
 * POS & Kho định giá theo shape `PriceConfig`/`PriceItem` (match theo purityCode +
 * weightUnitId + gramPerUnit). Bảng giá mới (`PriceTable`/`PriceRow`) chỉ có
 * `karat`/`type`/`unit`/`gramPerUnit`. Hàm này quy đổi để mọi consumer cũ chạy
 * không phải sửa logic:
 *   - weightUnitId  ← khớp WeightUnit theo maTocDoc === row.unit
 *   - goldPurityId  ← khớp GoldPurity theo ma === row.karat (cho InventoryDeclareForm)
 *   - hamLuong      ← từ GoldPurity tương ứng
 *
 * Pure function, không side-effect.
 */

import type { PriceTable, PriceConfig, PriceItem, WeightUnit, GoldPurity } from '@/types/config'

export function priceTableToPriceConfig(
  table: PriceTable,
  weightUnits: WeightUnit[],
  goldPurities: GoldPurity[],
): PriceConfig {
  const items: PriceItem[] = table.prices.map((row) => {
    const category: 'Gold' | 'Silver' = row.type === 'gold' ? 'Gold' : 'Silver'
    const wu = weightUnits.find((u) => u.maTocDoc === row.unit)
    // Khớp hàm lượng theo mã; nếu GoldPurity có category thì khớp thêm để tránh nhầm
    // (vd cùng mã ở 2 kim loại). Không có category → khớp theo mã.
    const gp = goldPurities.find(
      (p) => p.ma === row.karat && (!p.category || p.category === category),
    )

    return {
      goldPurityId: gp?.id ?? '',
      purityCode: row.karat,
      hamLuong: gp?.hamLuong ?? 0,
      category,
      weightUnitId: wu?.id ?? '',
      weightUnitCode: row.unit,
      gramPerUnit: row.gramPerUnit,
      buyPrice: row.buy,
      sellPrice: row.sell,
    }
  })

  return {
    id: table.id, // = priceTableId — dùng cho snapshot + tham chiếu khi checkout
    effectiveFrom: table.updatedAt,
    updatedBy: table.updatedBy,
    updatedAt: table.updatedAt,
    items,
  }
}
