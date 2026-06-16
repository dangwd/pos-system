/**
 * print.store.ts — Store quản lý in hóa đơn POS
 *
 * Luồng:
 *   Transaction (từ checkout / orders) → openPrint(tx)
 *     → normalize() → PrintInvoice → hiển thị modal
 *     → triggerPrint() → window.print() (CSS @media print ẩn UI)
 *
 * Hỗ trợ tất cả 7 nghiệp vụ POS:
 *   SellGold · SellSilver · BuyGold · BuyMoreGold
 *   ExchangeGold · ExchangeFree · ExchangeToMoney · ExchangeCurrency
 */

import { create } from 'zustand'
import { amountInWords, type AmountLocale } from '@/lib/amount-in-words'
import type { Transaction, TransactionType } from '@/types/transaction'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Một dòng hàng trên hóa đơn in */
export interface PrintItem {
  stt: number
  productName: string         // Tên hàng hóa / dịch vụ (snapshot)
  unitName: string            // Đơn vị tính (Chỉ / Gram / Baht…)
  quantity: number            // Số lượng
  weightGram: number          // Tổng gram (tham khảo)
  unitPriceLak: number        // Đơn giá (LAK/đơn vị)
  laborFee: number            // Tiền công / Phí gia công
  stoneFee: number            // Phí đá
  lineTotal: number           // Thành tiền
  itemRole: 'Normal' | 'ExchangeIn'
}

/** Tiêu đề hóa đơn theo nghiệp vụ */
export const INVOICE_TITLE: Record<TransactionType, { vi: string; lo: string; en: string }> = {
  SellGold:         { vi: 'HÓA ĐƠN BÁN VÀNG',        lo: 'ໃບບິນຂາຍຄຳ',           en: 'GOLD SALES INVOICE' },
  SellSilver:       { vi: 'HÓA ĐƠN BÁN BẠC',         lo: 'ໃບບິນຂາຍເງິນ',          en: 'SILVER SALES INVOICE' },
  BuyGold:          { vi: 'PHIẾU MUA VÀNG',           lo: 'ໃບຮັບຊື້ຄຳ',            en: 'GOLD PURCHASE RECEIPT' },
  BuyMoreGold:      { vi: 'PHIẾU MUA THÊM VÀNG',      lo: 'ໃບຮັບຊື້ຄຳເພີ່ມ',       en: 'ADDITIONAL GOLD PURCHASE' },
  ExchangeGold:     { vi: 'PHIẾU THU ĐỔI VÀNG',       lo: 'ໃບແລກປ່ຽນຄຳ',           en: 'GOLD EXCHANGE RECEIPT' },
  ExchangeFree:     { vi: 'PHIẾU ĐỔI VÀNG MIỄN PHÍ',  lo: 'ໃບແລກປ່ຽນຄຳຟຣີ',        en: 'FREE GOLD EXCHANGE' },
  ExchangeToMoney:  { vi: 'PHIẾU ĐỔI VÀNG LẤY TIỀN',  lo: 'ໃບແລກຄຳເປັນເງິນ',       en: 'GOLD TO CASH RECEIPT' },
  ExchangeCurrency: { vi: 'PHIẾU THU ĐỔI NGOẠI TỆ',   lo: 'ໃບແລກປ່ຽນເງິນຕ່າງປະເທດ', en: 'CURRENCY EXCHANGE RECEIPT' },
}

/** Dữ liệu hóa đơn đã normalize — sẵn sàng để render/in */
export interface PrintInvoice {
  // ── Metadata ────────────────────────────────────────────────────────────────
  invoiceCode: string
  txnType: TransactionType
  transactedAt: string          // ISO 8601

  // ── Chi nhánh / nhân viên ───────────────────────────────────────────────────
  branchName: string
  counterName: string
  cashierName: string

  // ── Khách hàng ──────────────────────────────────────────────────────────────
  customerName: string | null
  customerPhone: string | null

  // ── Danh sách sản phẩm ──────────────────────────────────────────────────────
  items: PrintItem[]
  /** Items phân loại: vàng mới (Normal) */
  normalItems: PrintItem[]
  /** Items phân loại: vàng cũ đổi vào (ExchangeIn) */
  exchangeInItems: PrintItem[]

  // ── Tổng tiền ───────────────────────────────────────────────────────────────
  subtotalAmount: number        // Tổng giá trị hàng (trước phí)
  laborFee: number              // Tổng phí gia công
  stoneFee: number              // Tổng phí đá
  totalAmount: number           // Tổng thanh toán

  // ── Số tiền bằng chữ ────────────────────────────────────────────────────────
  totalInWordsLo: string        // ພາສາລາວ
  totalInWordsVi: string        // Tiếng Việt
  totalInWordsEn: string        // English

  // ── Thanh toán ──────────────────────────────────────────────────────────────
  paymentMethod: 'CASH' | 'BANK' | 'COMBINED'
  cashAmount: number | null
  bankAmount: number | null

  // ── Ngoại tệ (ExchangeCurrency) ─────────────────────────────────────────────
  currency: string | null
  exchangeRate: number | null
  foreignAmount: number | null     // Số tiền nguồn khách đưa (snapshot từ DB)
  targetCurrency: string | null
  targetRateToLak: number | null
  targetAmount: number | null

  // ── Liên kết hóa đơn gốc (ExchangeGold / ExchangeFree) ─────────────────────
  referenceInvoiceCode: string | null

  // ── Ghi chú ─────────────────────────────────────────────────────────────────
  note: string | null
}

// ─── Normalize ────────────────────────────────────────────────────────────────

const EXCHANGE_TYPES: TransactionType[] = ['ExchangeGold', 'ExchangeFree', 'BuyMoreGold', 'ExchangeToMoney']

function normalize(tx: Transaction, ctx?: PrintContext): PrintInvoice {
  const items: PrintItem[] = tx.items.map((item, idx) => ({
    stt: idx + 1,
    productName: item.productSnapshotName,
    unitName: item.weightUnitName,
    quantity: item.quantity,
    weightGram: item.weightGram,
    // tableUnitPriceLak = giá gốc từ bảng giá (backend lưu độc lập).
    // Dùng cho in phiếu vì unitPriceLak có thể đã được điều chỉnh (hao hụt ExchangeIn).
    unitPriceLak: item.tableUnitPriceLak || item.unitPriceLak,
    laborFee: item.laborFee,
    stoneFee: item.stoneFee,
    lineTotal: item.lineTotal,
    itemRole: item.itemRole,
  }))

  // Với ExchangeGold/ExchangeFree/BuyMoreGold/ExchangeToMoney, totalAmount = A - B (có thể âm).
  // Số tiền bằng chữ luôn dùng giá trị tuyệt đối — chiều đổi được thể hiện bằng label riêng.
  const isExchange = EXCHANGE_TYPES.includes(tx.type)
  const printAmount = isExchange ? Math.abs(tx.totalAmount) : tx.totalAmount

  return {
    invoiceCode: tx.invoiceCode,
    txnType: tx.type,
    transactedAt: tx.transactedAt,

    // Ưu tiên dữ liệu từ transaction; fallback sang ctx khi backend trả rỗng
    branchName:  tx.branchName  || ctx?.branchName  || '',
    counterName: tx.counterName || ctx?.counterName || '',
    cashierName: tx.cashierName || ctx?.cashierName || '',

    customerName: tx.customer?.name ?? null,
    customerPhone: tx.customer?.phoneNumber ?? null,

    items,
    normalItems:     items.filter(i => i.itemRole === 'Normal'),
    exchangeInItems: items.filter(i => i.itemRole === 'ExchangeIn'),

    subtotalAmount: tx.subtotalAmount,
    laborFee:       tx.laborFee,
    stoneFee:       tx.stoneFee,
    totalAmount:    tx.totalAmount,

    totalInWordsLo: amountInWords(printAmount, 'lo'),
    totalInWordsVi: amountInWords(printAmount, 'vi'),
    totalInWordsEn: amountInWords(printAmount, 'en'),

    paymentMethod: tx.paymentMethod,
    cashAmount:    tx.cashAmount,
    bankAmount:    tx.bankAmount,

    currency:        tx.currency,
    exchangeRate:    tx.exchangeRate,
    foreignAmount:   tx.foreignAmount,
    targetCurrency:  tx.targetCurrency,
    targetRateToLak: tx.targetRateToLak,
    targetAmount:    tx.targetAmount,

    referenceInvoiceCode: tx.referenceInvoiceCode,
    note: tx.note,
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface PrintState {
  isOpen: boolean
  invoice: PrintInvoice | null
}

/** Context bổ sung — fallback khi backend không trả branchName/counterName/cashierName */
export interface PrintContext {
  branchName?: string
  counterName?: string
  cashierName?: string
}

interface PrintActions {
  /**
   * Normalize Transaction → PrintInvoice và mở modal in.
   * Gọi sau khi checkout thành công hoặc từ trang Nhật ký hóa đơn.
   * @param ctx Fallback info khi API response thiếu tên chi nhánh / quầy / nhân viên
   */
  openPrint: (tx: Transaction, ctx?: PrintContext) => void

  /** Đóng modal in, xóa dữ liệu hóa đơn */
  closePrint: () => void

  /**
   * Gọi window.print().
   * Component in cần có CSS `@media print` để ẩn mọi UI khác ngoài hóa đơn.
   */
  triggerPrint: () => void

  /** Lấy số tiền bằng chữ theo locale động (dùng trong component) */
  getAmountInWords: (amount: number, locale: AmountLocale) => string
}

export const usePrintStore = create<PrintState & PrintActions>()((set) => ({
  isOpen: false,
  invoice: null,

  openPrint: (tx, ctx) => set({ isOpen: true, invoice: normalize(tx, ctx) }),

  closePrint: () => set({ isOpen: false, invoice: null }),

  triggerPrint: () => {
    // Nhường UI render xong trước khi gọi print
    setTimeout(() => window.print(), 100)
  },

  getAmountInWords: (amount, locale) => amountInWords(amount, locale),
}))
