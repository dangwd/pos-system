/**
 * hooks/useSalesShift.ts — Boundary layer cho ca bán hàng
 *
 * useActiveShift        → GET /api/sales-shifts/active (staleTime 30s)
 * useOpenShift          → POST /api/sales-shifts/open
 * useCloseShift         → POST /api/sales-shifts/{id}/close
 * useActiveShiftDetail  → đọc detail đã cache từ lần open gần nhất
 */

import { extractErrorMessage, type AppLocale } from '@/lib/errors'
import { salesShiftRepository } from '@/lib/repositories/sales-shift.repository'
import type {
  CloseShiftRequest,
  CurrencyBalance,
  OpenShiftRequest,
  SalesShiftDetailDto,
} from '@/types/sales-shift'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { useToast } from '@/lib/toast'

const OPEN_DETAIL_KEY = ['sales-shifts', 'open-detail'] as const

export function useActiveShift() {
  return useQuery({
    queryKey: ['sales-shifts', 'active'],
    queryFn: () => salesShiftRepository.getActive(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

/** Trả về currencyBalances từ lần mở ca gần nhất (cache-only, không fetch). */
export function useActiveShiftCurrencies(): CurrencyBalance[] {
  const qc = useQueryClient()
  return qc.getQueryData<CurrencyBalance[]>(OPEN_DETAIL_KEY) ?? []
}

export function useOpenShift(onSuccess?: (data: SalesShiftDetailDto) => void) {
  const qc = useQueryClient()
  const locale = useLocale() as AppLocale
  const toast = useToast()

  return useMutation({
    mutationFn: (dto: OpenShiftRequest) => salesShiftRepository.open(dto),
    onSuccess: (data) => {
      qc.setQueryData(OPEN_DETAIL_KEY, data.currencyBalances)
      qc.invalidateQueries({ queryKey: ['sales-shifts'] })
      toast.success(`ເປີດກະສຳເລັດ · ${data.shiftCode}`)
      onSuccess?.(data)
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, locale))
    },
  })
}

export function useCloseShift(onSuccess?: (data: SalesShiftDetailDto) => void) {
  const qc = useQueryClient()
  const locale = useLocale() as AppLocale
  const toast = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CloseShiftRequest }) =>
      salesShiftRepository.close(id, dto),
    onSuccess: (data) => {
      qc.removeQueries({ queryKey: OPEN_DETAIL_KEY })
      qc.invalidateQueries({ queryKey: ['sales-shifts'] })
      toast.success(`ປິດກະສຳເລັດ · ${data.shiftCode}`)
      onSuccess?.(data)
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, locale))
    },
  })
}
