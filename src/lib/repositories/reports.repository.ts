import api from '@/lib/axios'
import type { DashboardReport, DailyReport, ReportParams, DailyReportParams } from '@/types/report'

export class ReportsRepository {
  async getDashboard(params?: ReportParams): Promise<DashboardReport> {
    const { data } = await api.get<DashboardReport>('/api/reports/dashboard', { params })
    return data
  }

  async getDaily(params: DailyReportParams): Promise<DailyReport> {
    const { data } = await api.get<DailyReport>('/api/reports/daily', { params })
    return data
  }
}

export const reportsRepository = new ReportsRepository()
