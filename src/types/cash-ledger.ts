export type CashEntryType =
  | 'INCOME'
  | 'EXPENSE'
  | 'SellGold'
  | 'SellSilver'
  | 'BuyGold'
  | 'ExchangeGold'
  | 'ExchangeCurrency'
  | 'BuyMoreGold'
  | 'ExchangeFree'
  | 'ExchangeToMoney'

/** Returns true if the entryType represents money coming IN */
export function isIncomeEntry(entryType: CashEntryType): boolean {
  return ['INCOME', 'SellGold', 'SellSilver', 'ExchangeCurrency', 'BuyMoreGold', 'ExchangeGold', 'ExchangeFree'].includes(entryType)
}
export type CashMethod = 'Cash' | 'BankTransfer' | 'QR' | 'COMBINED'
export type CashCurrency = 'LAK' | 'THB' | 'USD'

export interface CashLedgerEntry {
  id: string
  description: string
  entryType: CashEntryType
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
  entryType: CashEntryType
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
