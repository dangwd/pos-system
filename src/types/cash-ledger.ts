export type CashDirection = 'In' | 'Out'
export type CashMethod = 'Cash' | 'BankTransfer' | 'QR'
export type CashCurrency = 'LAK' | 'THB' | 'USD'

export interface CashLedgerEntry {
  id: string
  description: string
  direction: CashDirection
  method: CashMethod
  currency: CashCurrency
  originalAmount: number
  exchangeRate: number
  amountLak: number
  createdAt: string
}

export interface DailyCashLedger {
  branchId: string
  date: string
  openingBalanceLak: number
  totalInLak: number
  totalOutLak: number
  closingBalanceLak: number
  entries: CashLedgerEntry[]
}

export interface ManualEntryDto {
  branchId: string
  description: string
  direction: CashDirection
  method: CashMethod
  currency: CashCurrency
  originalAmount: number
  exchangeRate: number
}

export interface OpeningBalanceDto {
  branchId: string
  date: string
  cashAmountLak: number
  bankAmountLak: number
}
