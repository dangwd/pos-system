import type { TransactionType } from './transaction'

export interface TopProduct {
  productName: string
  quantitySold: number
  revenueLak: number
}

export interface DashboardReport {
  totalRevenueLak: number
  totalProfitLak: number
  totalTransactions: number
  transactionsByType: Partial<Record<TransactionType, number>>
  topProducts: TopProduct[]
}

export interface DailyReport {
  date: string
  branchName: string
  openingBalanceLak: number
  totalRevenueLak: number
  totalPurchaseLak: number
  closingBalanceLak: number
}

export interface ReportParams {
  from?: string
  to?: string
}

export interface DailyReportParams {
  branchId: string
  date?: string
}
