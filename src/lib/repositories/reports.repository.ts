import api from '@/lib/axios'
import type {
  DashboardReport, DailyReport, ReportParams, DailyReportParams,
  InventoryReport, InventoryReportParams,
  RevenueReport, RevenueReportParams,
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

  async getRevenue(params: RevenueReportParams): Promise<RevenueReport> {
    const { data } = await api.get<RevenueReport>('/api/reports/revenue', { params })
    return data
  }
}

export const reportsRepository = new ReportsRepository()
