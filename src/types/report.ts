export interface DashboardReport {
  totalRevenue: number
  totalPurchase: number
  cancelledCount: number
  from: string
  to: string
}

export interface TonKho {
  itemsOnDisplay: number
  totalWeightMg: number
}

export interface TonQuy {
  openingLak: number
  collectedLak: number
  paidLak: number
  closingLak: number
}

export interface DailyReport {
  date: string
  branchId: string
  doanhThuBan: number
  chiPhiMua: number
  doanhThuDoi: number
  laiGopTamTinh: number
  tongHoaDon: number
  tongGiaoDichTrade: number
  tonKho: TonKho
  tonQuy: TonQuy
}

export interface ReportParams {
  from?: string
  to?: string
}

export interface DailyReportParams {
  branchId: string
  date?: string
}
