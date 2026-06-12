'use client'

import { useQuery } from '@tanstack/react-query'
import { reportsRepository } from '@/lib/repositories/reports.repository'
import type { ReportParams, DailyReportParams } from '@/types/report'

export function useDashboardReport(params?: ReportParams) {
  return useQuery({
    queryKey: ['reports', 'dashboard', params],
    queryFn: () => reportsRepository.getDashboard(params),
    staleTime: 60_000,
  })
}

export function useDailyReport(params: DailyReportParams, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'daily', params.branchId, params.date],
    queryFn: () => reportsRepository.getDaily(params),
    staleTime: 60_000,
    enabled: enabled && !!params.branchId,
  })
}
