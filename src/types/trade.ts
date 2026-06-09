export type TradeType = 'BuyIn' | 'ExchangeGold'

export interface TradeTransaction {
  id: string
  invoiceCode: string
  loai: TradeType
  branchId: string
  customerId: string | null
  productId: string
  weightMg: number
  purity: string
  pricePerChi: number
  laborFee: number
  note: string
  referenceInvoiceCode: string | null
  totalAmount: number
  createdAt: string
}

export interface CreateTradeDto {
  branchId: string
  loai: TradeType
  customerId?: string
  productId: string
  weightMg: number
  purity: string
  pricePerChi: number
  laborFee: number
  note?: string
  referenceInvoiceCode?: string | null
}

export interface TradeListParams {
  branchId?: string
  loai?: TradeType
  from?: string
  to?: string
  page?: number
  limit?: number
}

export interface TradePage {
  total: number
  page: number
  pageSize: number
  data: TradeTransaction[]
}
