// Loại bút toán — theo API docs
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

export type CashMethod   = 'CASH' | 'BANK'
export type CashCurrency = 'LAK' | 'THB' | 'USD'
export type CashSource   = 'Transaction' | 'Manual'
export type CashSign     = 1 | -1

// Bút toán trong GET /daily và GET /activities
export interface CashLedgerEntry {
  id: string
  sortAt: string       // ISO datetime — dùng để sort
  timeLabel: string    // "HH:mm:ss" — giờ địa phương
  description: string
  method: CashMethod
  amountLak: number
  sign: CashSign       // +1 = thu, -1 = chi
  source: CashSource
  entryType: CashEntryType
}

// Response từ GET /daily
export interface DailyCashLedger {
  date: string
  branchId: string
  branchName: string
  openingCashLak: number
  openingBankLak: number
  openingBalanceId: string | null
  entries: CashLedgerEntry[]
  totalEntries: number
  expectedCashClosingLak: number
  expectedBankClosingLak: number
}

// Query params cho GET /activities
export interface CashLedgerActivitiesParams {
  branchId?: string
  counterId?: string
  fromDate?: string
  toDate?: string
  keyword?: string
  page?: number
  pageSize?: number
}

// Response từ GET /activities
export interface CashLedgerActivitiesResult {
  entries: CashLedgerEntry[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

// POST /manual-entry request body
export interface ManualEntryDto {
  branchId: string
  counterId?: string | null
  description: string
  direction: 'IN' | 'OUT'
  method: CashMethod
  currency: CashCurrency
  originalAmount: number
  exchangeRate: number
}

// POST /opening-balance request body
export interface OpeningBalanceDto {
  branchId: string
  counterId?: string | null
  date: string
  cashAmountLak: number
  bankAmountLak: number
}

// GET/PUT /cash-count types
export interface CashCountItem {
  currency: CashCurrency
  denomination: number
  quantity: number
}

export interface CashCountSheet {
  id: string | null
  isFinalized: boolean
  handoverCode: string | null
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

// POST /handover request body
export interface HandoverDto extends SaveCashCountDto {
  actualAmountLak: number
  expectedAmountLak: number
}
