'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { reportsRepository } from '@/lib/repositories/reports.repository'
import type {
  ReportParams, DailyReportParams, InventoryReportParams, RevenueReportParams,
  CurrencyExchangeReportParams, StockPeriodReportParams, StockTrendParams, StockMovementParams,
} from '@/types/report'

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

export function useInventoryReport(params?: InventoryReportParams) {
  return useQuery({
    queryKey: [
      'reports', 'inventory',
      params?.branchId ?? null, params?.counterId ?? null,
      params?.status ?? null, params?.keyword ?? null,
      params?.page ?? 1, params?.pageSize ?? 20,
    ],
    queryFn: () => reportsRepository.getInventory(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useStockPeriodReport(params: StockPeriodReportParams, enabled = true) {
  return useQuery({
    queryKey: [
      'reports', 'stock-period',
      params.fromDate, params.toDate,
      params.branchId ?? null, params.categoryId ?? null,
      params.karat ?? null, params.search ?? null,
    ],
    queryFn: () => reportsRepository.getStockPeriod(params),
    staleTime: 60_000,
    enabled: enabled && !!params.fromDate && !!params.toDate,
    placeholderData: keepPreviousData,
  })
}

export function useStockTrendReport(params: StockTrendParams, enabled = true) {
  return useQuery({
    queryKey: [
      'reports', 'stock-trend',
      params.fromDate, params.toDate, params.granularity ?? 'day',
      params.branchId ?? null, params.categoryId ?? null,
      params.karat ?? null, params.search ?? null,
    ],
    queryFn: () => reportsRepository.getStockTrend(params),
    staleTime: 60_000,
    enabled: enabled && !!params.fromDate && !!params.toDate,
    placeholderData: keepPreviousData,
  })
}

export function useStockMovements(params: StockMovementParams, enabled = true) {
  return useQuery({
    queryKey: [
      'reports', 'stock-movements',
      params.productId, params.branchId ?? null, params.fromDate, params.toDate,
    ],
    queryFn: () => reportsRepository.getStockMovements(params),
    staleTime: 60_000,
    enabled: enabled && !!params.productId,
  })
}

export function useRevenueReport(params: RevenueReportParams, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'revenue', params.branchId, params.period ?? 'month', params.date ?? null],
    queryFn: () => reportsRepository.getRevenue(params),
    staleTime: 60_000,
    enabled: enabled && !!params.branchId,
  })
}

export function useCurrencyExchangeReport(params?: CurrencyExchangeReportParams) {
  return useQuery({
    queryKey: [
      'reports', 'currency-exchange',
      params?.from ?? null, params?.to ?? null,
      params?.branchId ?? null, params?.counterId ?? null,
      params?.page ?? 1, params?.pageSize ?? 20,
    ],
    queryFn: () => reportsRepository.getCurrencyExchange(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}
