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

export interface CurrencyBalance {
  currency: string
  openingAmount: number
  closingAmount: number | null
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
  closingCashLak: number | null
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

export interface OpenShiftRequest {
  openingCashLak: number
  foreignCurrencyBalances?: { currency: string; openingAmount: number }[]
  note?: string
}

export interface CloseShiftRequest {
  closingCashLak: number
  foreignCurrencyBalances?: { currency: string; closingAmount: number }[]
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
  trangThai: string
  soPT_PC: string | null
  thoiGian: string
  hinhThucTT: string
  giaTri: number
  doiTuong: string | null
  khachHang: string | null
  quay: string
}
