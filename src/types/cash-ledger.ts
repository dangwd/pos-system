// types/cash-ledger.ts — đồng bộ API Reference v2 (2026-06-15)

export type CashDirection = 'IN' | 'OUT'
export type CashMethod    = 'CASH' | 'BANK' | 'COMBINED'
export type CashCurrency  = 'LAK' | 'THB' | 'USD'
export type CashSource    = 'Transaction' | 'Manual' | 'Handover'

export type CashEntryType =
  | 'SellGold'
  | 'SellSilver'
  | 'BuyGold'
  | 'ExchangeGold'
  | 'ExchangeCurrency'
  | 'BuyMoreGold'
  | 'ExchangeFree'
  | 'ExchangeToMoney'
  | 'IN'   // Thu thủ công
  | 'OUT'  // Chi thủ công

// ── GET /daily ─────────────────────────────────────────────────────────────────

export interface DailyCashLedger {
  date: string
  branchId: string
  branchName: string
  openingBalanceId: string | null
  openingBalanceLak: number    // Gộp tiền mặt + ngân hàng đầu ngày
  totalInLak: number           // Tổng thu trong ngày
  totalOutLak: number          // Tổng chi trong ngày
  closingBalanceLak: number    // = openingBalanceLak + totalInLak − totalOutLak
}

// ── GET /activities (list) ─────────────────────────────────────────────────────

export interface ActivityItem {
  id: string
  entryCode: string      // PTTT… (thu) hoặc PCTT… (chi)
  timeLabel: string      // "HH:mm:ss - dd/MM/yyyy"
  createdByName: string
  branchName: string
  methodLabel: string    // "Tiền mặt" | "Chuyển khoản ngân hàng" | "Tiền mặt & Chuyển khoản"
  direction: CashDirection
}

export interface CashLedgerActivitiesParams {
  branchId?: string
  counterId?: string
  fromDate?: string
  toDate?: string
  keyword?: string
  page?: number
  pageSize?: number
}

export interface CashLedgerActivitiesResult {
  items: ActivityItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ── GET /activities/{id} · POST /vouchers · GET /vouchers/{id} ─────────────────

export interface CashVoucherDto {
  id: string
  entryCode: string
  direction: CashDirection
  date: string
  createdAt: string
  timeLabel: string
  branchId: string
  branchName: string
  amountLak: number
  cashAmountLak: number
  bankAmountLak: number
  currency: CashCurrency
  exchangeRate: number
  method: CashMethod
  reasonCode: string | null
  reasonLabel: string | null
  customerId: string | null
  customerName: string | null
  fromCounterId: string | null
  fromCounterName: string | null
  toCounterId: string | null
  toCounterName: string | null
  referenceInvoiceCode: string | null
  originalReceiptCode: string | null
  createdById: string
  createdByName: string
  note: string | null
  description: string
  entryType: CashEntryType
  source: CashSource
}

// ── POST /manual-entry ────────────────────────────────────────────────────────

export interface ManualEntryRequest {
  branchId: string
  counterId?: string | null
  description: string
  direction: CashDirection
  method: 'CASH' | 'BANK'
  currency: CashCurrency
  originalAmount: number
  exchangeRate: number
}

export interface ManualEntryResponse {
  id: string
  entryCode: string
  description: string
  direction: CashDirection
  method: 'CASH' | 'BANK'
  amountLak: number
  createdAt: string
}

// ── POST /opening-balance ─────────────────────────────────────────────────────

export interface OpeningBalanceDto {
  branchId: string
  counterId?: string | null
  date: string
  cashAmountLak: number
  bankAmountLak: number
}

// ── GET /voucher-reasons ──────────────────────────────────────────────────────

export interface VoucherReason {
  code: string
  direction: CashDirection
  label: string
}

// ── POST /vouchers ────────────────────────────────────────────────────────────

export interface CreateVoucherDto {
  branchId: string
  direction: CashDirection
  reasonCode: string
  currency: CashCurrency
  exchangeRate: number
  cashAmount?: number
  bankAmount?: number
  customerId?: string | null
  customerName?: string | null
  fromCounterId?: string | null
  toCounterId?: string | null
  referenceInvoiceCode?: string | null
  originalReceiptCode?: string | null
  note?: string | null
}

// ── GET /vouchers ─────────────────────────────────────────────────────────────

export interface VoucherListParams {
  branchId: string
  fromDate?: string
  toDate?: string
  direction?: CashDirection
  keyword?: string
  page?: number
  pageSize?: number
}

export interface VoucherListResponse {
  vouchers: CashVoucherDto[]
  openingBalanceLak: number
  totalInLak: number
  totalOutLak: number
  closingBalanceLak: number
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// ── GET/PUT /cash-count ───────────────────────────────────────────────────────

export interface CashCountItem {
  currency: CashCurrency
  denomination: number
  quantity: number
}

export interface CashCountSheet {
  id: string | null
  isFinalized: boolean
  handoverCode: string | null   // format: HO-yyyyMMdd-XXXXX
  countedByName: string
  items: CashCountItem[]
}

export interface SaveCashCountDto {
  branchId: string
  counterId?: string | null
  date: string
  countedByName: string
  items: CashCountItem[]
}

// ── POST /handover ────────────────────────────────────────────────────────────

export interface HandoverDto extends SaveCashCountDto {
  actualAmountLak: number
  expectedAmountLak: number
}
