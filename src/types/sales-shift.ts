/**
 * types/sales-shift.ts
 *
 * Khớp với API /api/sales-shifts
 * Quy tắc: Ca bán hàng phải được mở trước khi tạo bất kỳ giao dịch nào.
 */

export interface ActiveShiftResponse {
  hasOpenShift: boolean
  shiftId: string | null
  shiftCode: string | null
  openingCashLak: number | null
  openedAt: string | null
  counterName: string | null
}

/** Một tờ mệnh giá trong ca — dùng cho cả LAK lẫn ngoại tệ */
export interface ShiftDenominationEntry {
  value: number
  openingQuantity: number | null
  closingQuantity: number | null
}

export interface CurrencyBalance {
  currency: string
  openingAmount: number
  closingAmount: number | null
  denominations: ShiftDenominationEntry[]
}

export interface SalesShiftSummary {
  banHangTotal: number
  banHangCash: number
  banHangBank: number
  muaHangTotal: number
  muaHangCash: number
  muaHangBank: number
  doiHangTotal: number
  phieuThuTotal: number
  phieuChiTotal: number
  datHangTotal: number
  baoHanhTotal: number
  netCashMovement: number
}

export interface SalesShiftDetailDto {
  id: string
  shiftCode: string
  userId: string
  userFullName: string
  userEmployeeCode: string
  userRoleName: string
  branchId: string
  branchName: string
  counterId: string
  counterName: string
  status: 'Open' | 'Closed'
  openingCashLak: number
  openingBankLak: number
  closingCashLak: number | null
  closingBankLak: number | null
  lakDenominations: ShiftDenominationEntry[]
  currencyBalances: CurrencyBalance[]
  note: string | null
  openedAt: string
  closedAt: string | null
  summary: SalesShiftSummary
}

export interface SalesShiftListItem {
  id: string
  shiftCode: string
  userId: string
  userFullName: string
  userEmployeeCode: string
  userRoleName: string
  branchId: string
  branchName: string
  counterId: string
  counterName: string
  status: 'Open' | 'Closed'
  openingCashLak: number
  closingCashLak: number | null
  openedAt: string
  closedAt: string | null
}

/** { value, quantity } — input mệnh giá khi mở/chốt ca */
export interface DenominationInput {
  value: number
  quantity: number
}

export interface OpenShiftRequest {
  openingCashLak: number
  openingBankLak?: number
  lakDenominations?: DenominationInput[]
  foreignCurrencyBalances?: {
    currency: string
    openingAmount: number
    denominations?: DenominationInput[]
  }[]
  note?: string
}

export interface CloseShiftRequest {
  closingCashLak: number
  closingBankLak: number
  lakDenominations?: DenominationInput[]
  foreignCurrencyBalances?: {
    currency: string
    closingAmount: number
    denominations?: DenominationInput[]
  }[]
}

export interface SalesShiftListParams {
  branchId?: string
  counterId?: string
  userId?: string
  status?: 'Open' | 'Closed'
  from?: string
  to?: string
  q?: string
  page?: number
  pageSize?: number
}

export interface ShiftTransactionItem {
  id: string
  nghiepVu: string
  chungTuGoc: string
  trangThai: 'Completed' | 'Cancelled'
  soPT_PC: string | null
  thoiGian: string
  hinhThucTT: string
  giaTri: number
  /** Tiền mặt LAK — có giá trị khi hinhThucTT = COMBINED; null với TradeTxn */
  cashAmount: number | null
  /** Chuyển khoản LAK — có giá trị khi hinhThucTT = COMBINED; null với TradeTxn */
  bankAmount: number | null
  doiTuong: string | null
  khachHang: string | null
  quay: string
  // Fields đặc thù Thu đổi ngoại tệ (null với các loại khác)
  sourceCurrency: string | null
  foreignAmount: number | null
  targetCurrency: string | null
  targetAmount: number | null
  // Fields đặc thù TradeTxn (null với các loại khác)
  /** Có dấu: > 0 khách trả thêm; < 0 cửa hàng hoàn tiền */
  chenhLech: number | null
  itemCuName: string | null
  /** null nếu nghiệp vụ là Đổi thành tiền */
  itemMoiName: string | null
}
