/**
 * Quy đổi tiền tệ hiển thị (client-side).
 * API luôn trả KIP nguyên; FE quy đổi sang tiền tệ đang chọn để hiển thị.
 * Tỷ giá tham khảo — có thể thay bằng API tỷ giá động sau này.
 */

export type CurrencyCode = 'KIP' | 'THB' | 'USD' | 'CNY'

export interface CurrencyMeta {
  rate: number // displayValue = rawKip * rate
  sym: string
  dec: number
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  KIP: { rate: 1, sym: '₭', dec: 0 },
  THB: { rate: 0.00177, sym: '฿', dec: 2 },
  USD: { rate: 0.000048, sym: '$', dec: 2 },
  CNY: { rate: 0.000348, sym: '¥', dec: 2 },
}

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[]

/** Quy đổi KIP → giá trị hiển thị (number). */
export function convertKip(rawKip: number, cur: CurrencyCode): number {
  return rawKip * CURRENCIES[cur].rate
}

/** "9,800,000 ₭" / "17,346.00 ฿" — quy đổi + format theo tiền tệ. */
export function formatCurrency(rawKip: number, cur: CurrencyCode): string {
  const { rate, sym, dec } = CURRENCIES[cur]
  const v = (rawKip ?? 0) * rate
  return v.toLocaleString('vi-VN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + ' ' + sym
}

/** Rút gọn cho trục biểu đồ: 1.5T / 750M / 50K (theo giá trị đã quy đổi). */
export function compactCurrency(rawKip: number, cur: CurrencyCode): string {
  const v = convertKip(rawKip ?? 0, cur)
  const a = Math.abs(v)
  if (a >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'T'
  if (a >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return Math.round(v / 1e3) + 'K'
  return v.toLocaleString('vi-VN', { maximumFractionDigits: CURRENCIES[cur].dec })
}
