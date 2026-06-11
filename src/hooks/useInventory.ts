import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { inventoryRepository } from '@/lib/repositories/inventory.repository'
import { getErrorMessage, type AppLocale } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import { useConfigPrices, useExchangeRates } from '@/hooks/useConfig'
import { summarizeInventory, valuateItem } from '@/lib/inventory-valuation'
import type {
  InventoryListParams,
  InventoryAdjustmentParams,
  AdjustInventoryDto,
  AdjustInventoryResult,
  UpdateInventoryStatusDto,
  InventoryItem,
} from '@/types/inventory'

const INVENTORY_KEY = ['inventory'] as const

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useInventory(params?: InventoryListParams) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, 'list', params],
    queryFn: () => inventoryRepository.getList(params),
    staleTime: 60_000,
  })
}

/** Danh sách tồn kho dạng mảng (không phân trang) — catalog theo chi nhánh. */
export function useInventoryList(
  params?: Omit<InventoryListParams, 'page' | 'pageSize'>,
  enabled = true,
) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, 'all', params],
    queryFn: () => inventoryRepository.getAll(params),
    staleTime: 60_000,
    enabled,
  })
}

/**
 * Danh sách tồn kho theo chi nhánh + định giá theo bảng giá hiện hành.
 * Trả về items, tổng hợp summary và hàm valuate (đã memo) cho cột giá.
 */
export function useInventoryValuation(branchId: string | null) {
  const itemsQuery = useInventoryList({ branchId: branchId ?? undefined }, !!branchId)
  const { data: priceConfig } = useConfigPrices()
  const { data: rates } = useExchangeRates()

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data])
  const totals = useMemo(() => summarizeInventory(items, priceConfig), [items, priceConfig])
  const valuate = useMemo(() => (item: InventoryItem) => valuateItem(item, priceConfig), [priceConfig])

  return {
    items,
    totals,
    valuate,
    rates,
    isLoading: itemsQuery.isLoading,
  }
}

export function useInventoryItem(id: string | null) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, 'item', id],
    queryFn: () => inventoryRepository.getById(id!),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useInventoryAdjustments(
  params: InventoryAdjustmentParams | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [...INVENTORY_KEY, 'adjustments', params],
    queryFn: () => inventoryRepository.getAdjustments(params),
    staleTime: 30_000,
    enabled,
  })
}

// ─── Mutation base ───────────────────────────────────────────────────────────

function useInventoryMutationBase() {
  const qc = useQueryClient()
  const locale = useLocale() as AppLocale
  const t = useTranslations('admin.inventory.toasts')
  const invalidate = () => qc.invalidateQueries({ queryKey: INVENTORY_KEY })
  return { locale, t, invalidate }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export function useAdjustInventory() {
  const { locale, t, invalidate } = useInventoryMutationBase()
  return useMutation<AdjustInventoryResult, ApiError, { id: string; dto: AdjustInventoryDto }>({
    mutationFn: ({ id, dto }) => inventoryRepository.adjust(id, dto),
    onSuccess: (res) => {
      invalidate()
      toast.success(t('adjustSuccess', { code: res.log.adjustmentCode }))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateInventoryStatus() {
  const { locale, t, invalidate } = useInventoryMutationBase()
  return useMutation<InventoryItem, ApiError, { id: string; dto: UpdateInventoryStatusDto }>({
    mutationFn: ({ id, dto }) => inventoryRepository.updateStatus(id, dto),
    onSuccess: () => {
      invalidate()
      toast.success(t('statusSuccess'))
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
