import { extractErrorMessage, type AppLocale } from '@/lib/errors'
import { salesShiftRepository } from '@/lib/repositories/sales-shift.repository'
import type {
  CloseShiftRequest,
  CurrencyBalance,
  OpenShiftRequest,
  SalesShiftDetailDto,
  SalesShiftListParams,
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

/** Trả về currencyBalances từ lần mở ca gần nhất (cache-only, reactive). */
export function useActiveShiftCurrencies(): CurrencyBalance[] {
  const { data } = useQuery<CurrencyBalance[]>({
    queryKey: OPEN_DETAIL_KEY,
    queryFn: () => Promise.resolve([] as CurrencyBalance[]),
    enabled: false,
    staleTime: Infinity,
  })
  return data ?? []
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

/** Danh sách ca bán hàng (yêu cầu permission SALES_SHIFT_MANAGE) */
export function useSalesShiftList(params?: SalesShiftListParams) {
  return useQuery({
    queryKey: ['sales-shifts', 'list', params],
    queryFn: () => salesShiftRepository.getList(params),
    staleTime: 30_000,
  })
}

/** Chi tiết một ca kèm summary (yêu cầu permission SALES_SHIFT_MANAGE) */
export function useShiftDetail(id: string | null) {
  return useQuery({
    queryKey: ['sales-shifts', 'detail', id],
    queryFn: () => salesShiftRepository.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

/** Danh sách giao dịch trong ca (yêu cầu permission SALES_SHIFT_MANAGE) */
export function useShiftTransactions(
  shiftId: string | null,
  params?: { q?: string; page?: number; pageSize?: number },
) {
  return useQuery({
    queryKey: ['sales-shifts', 'transactions', shiftId, params],
    queryFn: () => salesShiftRepository.getTransactions(shiftId!, params),
    enabled: !!shiftId,
    staleTime: 30_000,
  })
}
