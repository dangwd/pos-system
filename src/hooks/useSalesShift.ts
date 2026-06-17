/**
 * hooks/useSalesShift.ts — Boundary layer cho ca bán hàng
 *
 * useActiveShift   → GET /api/sales-shifts/active (staleTime 30s)
 * useOpenShift     → POST /api/sales-shifts/open
 * useCloseShift    → POST /api/sales-shifts/{id}/close
 */

import { extractErrorMessage, type AppLocale } from '@/lib/errors'
import { salesShiftRepository } from '@/lib/repositories/sales-shift.repository'
import type {
  CloseShiftRequest,
  OpenShiftRequest,
  SalesShiftDetailDto,
} from '@/types/sales-shift'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { toast } from '@/lib/toast'

export function useActiveShift() {
  return useQuery({
    queryKey: ['sales-shifts', 'active'],
    queryFn: () => salesShiftRepository.getActive(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}

export function useOpenShift(onSuccess?: (data: SalesShiftDetailDto) => void) {
  const qc = useQueryClient()
  const locale = useLocale() as AppLocale

  return useMutation({
    mutationFn: (dto: OpenShiftRequest) => salesShiftRepository.open(dto),
    onSuccess: (data) => {
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

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CloseShiftRequest }) =>
      salesShiftRepository.close(id, dto),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['sales-shifts'] })
      toast.success(`ປິດກະສຳເລັດ · ${data.shiftCode}`)
      onSuccess?.(data)
    },
    onError: (err: unknown) => {
      toast.error(extractErrorMessage(err, locale))
    },
  })
}
