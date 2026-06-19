import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { cashLedgerRepository } from '@/lib/repositories/cash-ledger.repository'
import type { CashLedgerActivitiesParams } from '@/types/cash-ledger'

/** GET /api/cash-ledger/activities — danh sách bút toán sổ quỹ + tổng hợp theo bộ lọc */
export function useCashLedgerActivities(params: CashLedgerActivitiesParams) {
  return useQuery({
    queryKey: [
      'cash-ledger', 'activities',
      params.branchId ?? null, params.counterId ?? null,
      params.fromDate ?? null, params.toDate ?? null,
      params.keyword ?? null, params.currency ?? null,
      params.method ?? null, params.page ?? 1, params.pageSize ?? 20,
    ],
    queryFn: () => cashLedgerRepository.getActivities(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
