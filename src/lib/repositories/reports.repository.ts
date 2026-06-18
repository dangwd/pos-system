import api from '@/lib/axios'
import type {
  DashboardReport, DailyReport, ReportParams, DailyReportParams,
  InventoryReport, InventoryReportParams,
  StockPeriodReport, StockPeriodReportParams,
  StockTrendReport, StockTrendParams,
  StockMovementLine, StockMovementParams,
  RevenueReport, RevenueReportParams,
  CurrencyExchangeReport, CurrencyExchangeReportParams,
} from '@/types/report'

export class ReportsRepository {
  async getDashboard(params?: ReportParams): Promise<DashboardReport> {
    const { data } = await api.get<DashboardReport>('/api/reports/dashboard', { params })
    return data
  }

  async getDaily(params: DailyReportParams): Promise<DailyReport> {
    const { data } = await api.get<DailyReport>('/api/reports/daily', { params })
    return data
  }

  async getInventory(params?: InventoryReportParams): Promise<InventoryReport> {
    const { data } = await api.get<InventoryReport>('/api/reports/inventory', { params })
    return data
  }

  async getStockPeriod(params: StockPeriodReportParams): Promise<StockPeriodReport> {
    const { data } = await api.get<StockPeriodReport>('/api/stock/period-report', { params })
    return data
  }

  async getStockTrend(params: StockTrendParams): Promise<StockTrendReport> {
    const { data } = await api.get<StockTrendReport>('/api/stock/period-report/trend', { params })
    return data
  }

  async getStockMovements(params: StockMovementParams): Promise<StockMovementLine[]> {
    const { data } = await api.get<StockMovementLine[]>('/api/stock/period-report/movements', { params })
    return data
  }

  async exportStockPeriod(params: StockPeriodReportParams): Promise<void> {
    const response = await api.get('/api/stock/period-report/export', { params, responseType: 'blob' })
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ton-kho-theo-ky-${params.fromDate}_${params.toDate}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async getRevenue(params: RevenueReportParams): Promise<RevenueReport> {
    const { data } = await api.get<RevenueReport>('/api/revenue/report', { params })
    return data
  }

  async exportRevenue(params: RevenueReportParams): Promise<void> {
    const response = await api.get('/api/revenue/report/export', { params, responseType: 'blob' })
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bao-cao-doanh-thu-${params.fromDate}_${params.toDate}.xlsx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async getCurrencyExchange(params?: CurrencyExchangeReportParams): Promise<CurrencyExchangeReport> {
    const { data } = await api.get<CurrencyExchangeReport>('/api/reports/currency-exchange', { params })
    return data
  }
}

export const reportsRepository = new ReportsRepository()
