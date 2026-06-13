/**
 * amount-in-words.ts
 *
 * Chuyển số tiền LAK → chữ đọc (Lào / Việt / Anh).
 * Dùng cho dòng "Số tiền viết bằng chữ" trên hóa đơn.
 *
 * Đơn vị: Kip Lào (₭)
 */

// ─── Tiếng Việt ───────────────────────────────────────────────────────────────

const VI_ONES = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
const VI_TEENS = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn',
  'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín']

function viHundreds(n: number): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const remainder = n % 100
  const tens = Math.floor(remainder / 10)
  const ones = remainder % 10

  let result = h > 0 ? `${VI_ONES[h]} trăm` : ''

  if (remainder === 0) return result.trim()
  if (tens === 0 && h > 0) result += ' linh'
  if (tens === 1) {
    result += ` ${VI_TEENS[ones]}`
  } else if (tens > 1) {
    result += ` ${VI_ONES[tens]} mươi`
    if (ones === 1) result += ' mốt'
    else if (ones === 5) result += ' lăm'
    else if (ones > 0) result += ` ${VI_ONES[ones]}`
  } else {
    result += ` ${VI_ONES[ones]}`
  }
  return result.trim()
}

function amountInWordsVi(amount: number): string {
  if (amount === 0) return 'Không kip'
  if (!Number.isFinite(amount) || amount < 0) return ''

  const n = Math.round(amount)
  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1_000)
  const remainder = n % 1_000

  const parts: string[] = []
  if (billions > 0) parts.push(`${viHundreds(billions)} tỷ`)
  if (millions > 0) parts.push(`${viHundreds(millions)} triệu`)
  if (thousands > 0) parts.push(`${viHundreds(thousands)} nghìn`)
  if (remainder > 0) parts.push(viHundreds(remainder))

  const words = parts.join(' ').trim()
  // Capitalize first letter
  return words.charAt(0).toUpperCase() + words.slice(1) + ' kip'
}

// ─── Tiếng Lào ───────────────────────────────────────────────────────────────

const LO_ONES = ['', 'ໜຶ່ງ', 'ສອງ', 'ສາມ', 'ສີ່', 'ຫ້າ', 'ຫົກ', 'ເຈັດ', 'ແປດ', 'ເກົ້າ']
const LO_TENS = ['', 'ສິບ', 'ຊາວ', 'ສາມສິບ', 'ສີ່ສິບ', 'ຫ້າສິບ',
  'ຫົກສິບ', 'ເຈັດສິບ', 'ແປດສິບ', 'ເກົ້າສິບ']

function loHundreds(n: number): string {
  if (n === 0) return ''
  const h = Math.floor(n / 100)
  const remainder = n % 100
  const tens = Math.floor(remainder / 10)
  const ones = remainder % 10

  let result = h > 0 ? `${LO_ONES[h]}ຮ້ອຍ` : ''
  if (tens > 0) result += LO_TENS[tens]
  if (ones > 0) result += LO_ONES[ones]
  return result
}

function amountInWordsLo(amount: number): string {
  if (amount === 0) return 'ສູນກີບ'
  if (!Number.isFinite(amount) || amount < 0) return ''

  const n = Math.round(amount)
  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1_000)
  const remainder = n % 1_000

  const parts: string[] = []
  if (billions > 0) parts.push(`${loHundreds(billions)}ຕື້`)
  if (millions > 0) parts.push(`${loHundreds(millions)}ລ້ານ`)
  if (thousands > 0) parts.push(`${loHundreds(thousands)}ພັນ`)
  if (remainder > 0) parts.push(loHundreds(remainder))

  return parts.join('') + 'ກີບ'
}

// ─── Tiếng Anh ────────────────────────────────────────────────────────────────

const EN_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five',
  'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
  'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const EN_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
  'Sixty', 'Seventy', 'Eighty', 'Ninety']

function enHundreds(n: number): string {
  if (n === 0) return ''
  if (n < 20) return EN_ONES[n]
  if (n < 100) {
    const t = EN_TENS[Math.floor(n / 10)]
    const o = n % 10
    return o > 0 ? `${t}-${EN_ONES[o]}` : t
  }
  const h = Math.floor(n / 100)
  const rem = n % 100
  return rem > 0 ? `${EN_ONES[h]} Hundred ${enHundreds(rem)}` : `${EN_ONES[h]} Hundred`
}

function amountInWordsEn(amount: number): string {
  if (amount === 0) return 'Zero Kip'
  if (!Number.isFinite(amount) || amount < 0) return ''

  const n = Math.round(amount)
  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1_000)
  const remainder = n % 1_000

  const parts: string[] = []
  if (billions > 0) parts.push(`${enHundreds(billions)} Billion`)
  if (millions > 0) parts.push(`${enHundreds(millions)} Million`)
  if (thousands > 0) parts.push(`${enHundreds(thousands)} Thousand`)
  if (remainder > 0) parts.push(enHundreds(remainder))

  return parts.join(' ') + ' Kip'
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type AmountLocale = 'lo' | 'vi' | 'en'

export function amountInWords(amount: number, locale: AmountLocale = 'lo'): string {
  switch (locale) {
    case 'lo': return amountInWordsLo(amount)
    case 'vi': return amountInWordsVi(amount)
    case 'en': return amountInWordsEn(amount)
  }
}
