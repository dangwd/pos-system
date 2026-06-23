import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { useToast } from '@/lib/toast'
import { configRepository } from '@/lib/repositories/config.repository'
import { priceTableToPriceConfig } from '@/lib/price-table-adapter'
import { getErrorMessage } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type { AppLocale } from '@/lib/errors'
import type { PagedResult } from '@/types/common'
import type {
  PriceConfig,
  PriceTable,
  CreatePriceTableDto,
  TogglePriceTableActiveDto,
  ExchangeRate,
  UpdateExchangeRateDto,
  BulkUpdateExchangeRatesRequest,
  ExchangeRateSession,
  ExchangeRatePair,
  UpdateExchangeRatePairDto,
  BulkUpdateExchangeRatePairsRequest,
  ExchangeRatePairSession,
  ExchangeHistoryQuery,
  StonePriceRule,
  CreateStonePriceRuleDto,
  UpdateStonePriceRuleDto,
  WeightUnit,
  CreateWeightUnitDto,
  UpdateWeightUnitDto,
  GoldPurity,
  CreateGoldPurityDto,
  UpdateGoldPurityDto,
  AppRole,
  UpdateRolePermissionsDto,
  CreateRoleDto,
  UpdateRoleDto,
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from '@/types/config'

// ─── Query keys ───────────────────────────────────────────────────────────────

const EXCHANGE_RATES_KEY              = ['config', 'exchange-rates'] as const
const EXCHANGE_RATE_HISTORY_KEY       = ['config', 'exchange-rates', 'history'] as const
const EXCHANGE_RATE_PAIRS_KEY         = ['config', 'exchange-rate-pairs'] as const
const EXCHANGE_RATE_PAIR_HISTORY_KEY  = ['config', 'exchange-rate-pairs', 'history'] as const
const STONE_RULES_KEY = ['config', 'stone-price-rules'] as const
const WEIGHT_UNITS_KEY = ['config', 'weight-units'] as const
const GOLD_PURITIES_KEY = ['config', 'gold-purities'] as const

function useConfigBase() {
  const locale = useLocale() as AppLocale
  const qc = useQueryClient()
  const toast = useToast()
  const invalidate = (key: readonly string[]) => qc.invalidateQueries({ queryKey: key })
  return { locale, toast, invalidate }
}

// ─── Bảng giá đang áp dụng (POS & Kho lấy giá từ đây) ────────────────────────
// Nguồn giá hiện hành = bảng giá active resolve theo JWT (GET /api/price-tables/active).
// useActivePriceConfig() quy đổi sang shape PriceConfig để mọi consumer cũ dùng lại.

const ACTIVE_PRICE_TABLE_KEY = ['config', 'price-table', 'active'] as const

export function useActivePriceTable() {
  return useQuery<PriceTable, ApiError>({
    queryKey: ACTIVE_PRICE_TABLE_KEY,
    queryFn: () => configRepository.getActivePriceTable(),
    staleTime: 60_000,
    retry: false, // 404 (không có bảng active) là trạng thái nghiệp vụ, không retry
  })
}

/**
 * Bảng giá đang áp dụng, đã quy đổi sang shape PriceConfig.
 * `priceTableId` = id bảng giá (gửi kèm khi checkout). `errorCode` để UI báo lỗi
 * (vd PRICE_TABLE_NOT_FOUND khi chi nhánh chưa có bảng active).
 */
export function useActivePriceConfig() {
  const tableQuery = useActivePriceTable()
  const { data: weightUnits = [] } = useWeightUnits()
  const { data: goldPurities = [] } = useGoldPurities()

  const priceConfig = useMemo<PriceConfig | undefined>(() => {
    if (!tableQuery.data) return undefined
    return priceTableToPriceConfig(tableQuery.data, weightUnits, goldPurities)
  }, [tableQuery.data, weightUnits, goldPurities])

  return {
    priceConfig,
    priceTableId: tableQuery.data?.id,
    isLoading: tableQuery.isLoading,
    isError: tableQuery.isError,
    errorCode: tableQuery.error?.code,
  }
}

// ─── Bảng giá (nhiều bảng song song) ─────────────────────────────────────────

const PRICE_TABLES_KEY = ['config', 'price-tables'] as const

export function usePriceTables() {
  return useQuery({
    queryKey: PRICE_TABLES_KEY,
    queryFn: () => configRepository.getPriceTables(),
    staleTime: 60_000,
  })
}

export function useCreatePriceTable() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<PriceTable, ApiError, CreatePriceTableDto>({
    mutationFn: (dto) => configRepository.createPriceTable(dto),
    onSuccess: () => {
      invalidate(PRICE_TABLES_KEY)
      toast.success(
        locale === 'lo' ? 'ສ້າງຕາຕະລາງລາຄາສຳເລັດ'
          : locale === 'vi' ? 'Tạo bảng giá thành công'
          : 'Price table created',
      )
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useTogglePriceTableActive() {
  const { locale, toast, invalidate } = useConfigBase()
  const qc = useQueryClient()
  return useMutation<PriceTable, ApiError, { id: string; active: boolean }>({
    mutationFn: ({ id, active }) =>
      configRepository.togglePriceTableActive(id, { active } as TogglePriceTableActiveDto),
    onSuccess: (updated) => {
      qc.setQueryData<PriceTable[]>(PRICE_TABLES_KEY, (prev) =>
        prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev,
      )
      invalidate(PRICE_TABLES_KEY)
      toast.success(
        locale === 'lo' ? 'ອັບເດດສະຖານະສຳເລັດ'
          : locale === 'vi' ? 'Cập nhật trạng thái thành công'
          : 'Status updated',
      )
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Tỷ giá LAK (exchange_rates) ────────────────────────────────────────────────

export function useExchangeRates() {
  return useQuery({
    queryKey: EXCHANGE_RATES_KEY,
    queryFn: () => configRepository.getExchangeRates(),
    staleTime: 60_000,
  })
}

export function useUpdateExchangeRate() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<ExchangeRate, ApiError, UpdateExchangeRateDto>({
    mutationFn: (dto) => configRepository.updateExchangeRate(dto),
    onSuccess: () => {
      invalidate(EXCHANGE_RATES_KEY)
      invalidate(EXCHANGE_RATE_HISTORY_KEY)
      invalidate(EXCHANGE_RATE_PAIRS_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດອັດຕາສຳເລັດ' : locale === 'vi' ? 'Cập nhật tỷ giá thành công' : 'Exchange rate updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useBulkUpdateExchangeRates() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<ExchangeRate[], ApiError, BulkUpdateExchangeRatesRequest>({
    mutationFn: (dto) => configRepository.bulkUpdateExchangeRates(dto),
    onSuccess: () => {
      invalidate(EXCHANGE_RATES_KEY)
      invalidate(EXCHANGE_RATE_HISTORY_KEY)
      invalidate(EXCHANGE_RATE_PAIRS_KEY)
      toast.success(
        locale === 'lo' ? 'ອັບເດດອັດຕາທັງໝົດສຳເລັດ'
          : locale === 'vi' ? 'Cập nhật tỷ giá hàng loạt thành công'
          : 'Bulk exchange rate update successful',
      )
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

/** Lịch sử tỷ giá LAK theo phiên — phân trang + lọc (page/pageSize/fromDate/toDate/currency). */
export function useExchangeRateHistory(query: ExchangeHistoryQuery = {}, enabled = true) {
  return useQuery<PagedResult<ExchangeRateSession>, ApiError>({
    queryKey: [...EXCHANGE_RATE_HISTORY_KEY, query],
    queryFn: () => configRepository.getExchangeRateHistory(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  })
}

// ─── Rate Graph — cặp tỷ giá (exchange_rate_pairs) ──────────────────────────────

/** Cặp tỷ giá theo tiền gốc `from` (kèm cross-rate isComputed). Bỏ trống `from` = toàn bộ cặp đã lưu. */
export function useExchangeRatePairs(from?: string, enabled = true) {
  return useQuery<ExchangeRatePair[], ApiError>({
    queryKey: [...EXCHANGE_RATE_PAIRS_KEY, from ?? null],
    queryFn: () => configRepository.getExchangeRatePairs(from),
    staleTime: 60_000,
    enabled,
  })
}

export function useUpdateExchangeRatePair() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<ExchangeRatePair, ApiError, { from: string; to: string; dto: UpdateExchangeRatePairDto }>({
    mutationFn: ({ from, to, dto }) => configRepository.updateExchangeRatePair(from, to, dto),
    onSuccess: () => {
      invalidate(EXCHANGE_RATE_PAIRS_KEY)
      invalidate(EXCHANGE_RATE_PAIR_HISTORY_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດອັດຕາສຳເລັດ' : locale === 'vi' ? 'Cập nhật tỷ giá thành công' : 'Pair rate updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useBulkUpdateExchangeRatePairs() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<ExchangeRatePair[], ApiError, BulkUpdateExchangeRatePairsRequest>({
    mutationFn: (dto) => configRepository.bulkUpdateExchangeRatePairs(dto),
    onSuccess: () => {
      invalidate(EXCHANGE_RATE_PAIRS_KEY)
      invalidate(EXCHANGE_RATE_PAIR_HISTORY_KEY)
      toast.success(
        locale === 'lo' ? 'ອັບເດດອັດຕາທັງໝົດສຳເລັດ'
          : locale === 'vi' ? 'Cập nhật tỷ giá hàng loạt thành công'
          : 'Bulk pair update successful',
      )
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

/** Lịch sử Rate Graph theo phiên — phân trang + lọc (page/pageSize/fromDate/toDate/currency). */
export function useExchangeRatePairHistory(query: ExchangeHistoryQuery = {}, enabled = true) {
  return useQuery<PagedResult<ExchangeRatePairSession>, ApiError>({
    queryKey: [...EXCHANGE_RATE_PAIR_HISTORY_KEY, query],
    queryFn: () => configRepository.getExchangeRatePairHistory(query),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    enabled,
  })
}

// ─── Phí đá ───────────────────────────────────────────────────────────────────

export function useStonePriceRules() {
  return useQuery({
    queryKey: STONE_RULES_KEY,
    queryFn: () => configRepository.getStonePriceRules(),
    staleTime: 300_000,
  })
}

export function useCreateStonePriceRule() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<StonePriceRule, ApiError, CreateStonePriceRuleDto>({
    mutationFn: (dto) => configRepository.createStonePriceRule(dto),
    onSuccess: () => invalidate(STONE_RULES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateStonePriceRule() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<StonePriceRule, ApiError, { id: string; dto: UpdateStonePriceRuleDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateStonePriceRule(id, dto),
    onSuccess: () => invalidate(STONE_RULES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteStonePriceRule() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => configRepository.deleteStonePriceRule(id),
    onSuccess: () => invalidate(STONE_RULES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Đơn vị trọng lượng ───────────────────────────────────────────────────────

export function useWeightUnits() {
  return useQuery({
    queryKey: WEIGHT_UNITS_KEY,
    queryFn: () => configRepository.getWeightUnits(),
    staleTime: 600_000,
  })
}

export function useCreateWeightUnit() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<WeightUnit, ApiError, CreateWeightUnitDto>({
    mutationFn: (dto) => configRepository.createWeightUnit(dto),
    onSuccess: () => invalidate(WEIGHT_UNITS_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateWeightUnit() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<WeightUnit, ApiError, { id: string; dto: UpdateWeightUnitDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateWeightUnit(id, dto),
    onSuccess: () => invalidate(WEIGHT_UNITS_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteWeightUnit() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => configRepository.deleteWeightUnit(id),
    onSuccess: () => invalidate(WEIGHT_UNITS_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Hàm lượng vàng / bạc ─────────────────────────────────────────────────────

export function useGoldPurities() {
  return useQuery({
    queryKey: GOLD_PURITIES_KEY,
    queryFn: () => configRepository.getGoldPurities(),
    staleTime: 600_000,
  })
}

export function useCreateGoldPurity() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<GoldPurity, ApiError, CreateGoldPurityDto>({
    mutationFn: (dto) => configRepository.createGoldPurity(dto),
    onSuccess: () => invalidate(GOLD_PURITIES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateGoldPurity() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<GoldPurity, ApiError, { id: string; dto: UpdateGoldPurityDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateGoldPurity(id, dto),
    onSuccess: () => invalidate(GOLD_PURITIES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteGoldPurity() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => configRepository.deleteGoldPurity(id),
    onSuccess: () => invalidate(GOLD_PURITIES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Currencies ────────────────────────────────────────────────────────────────

const CURRENCIES_KEY = ['currencies'] as const

export function useCurrencies() {
  return useQuery({
    queryKey: CURRENCIES_KEY,
    queryFn: () => configRepository.getCurrencies(),
    staleTime: 300_000,
  })
}

export function useCreateCurrency() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<Currency, ApiError, CreateCurrencyDto>({
    mutationFn: (dto) => configRepository.createCurrency(dto),
    onSuccess: () => {
      invalidate(CURRENCIES_KEY)
      toast.success(locale === 'lo' ? 'ເພີ່ມສະກຸນເງິນສຳເລັດ' : locale === 'vi' ? 'Thêm tiền tệ thành công' : 'Currency added')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateCurrency() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<Currency, ApiError, { id: string; dto: UpdateCurrencyDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateCurrency(id, dto),
    onSuccess: () => {
      invalidate(CURRENCIES_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດສະກຸນເງິນສຳເລັດ' : locale === 'vi' ? 'Cập nhật tiền tệ thành công' : 'Currency updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteCurrency() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => configRepository.deleteCurrency(id),
    onSuccess: () => {
      invalidate(CURRENCIES_KEY)
      toast.success(locale === 'lo' ? 'ລຶບສະກຸນເງິນສຳເລັດ' : locale === 'vi' ? 'Xóa tiền tệ thành công' : 'Currency deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Roles & Permissions ───────────────────────────────────────────────────────

const ROLES_KEY = ['config', 'roles'] as const
const PERMISSIONS_KEY = ['config', 'permissions'] as const

export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => configRepository.getRoles(),
    staleTime: 300_000,
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: PERMISSIONS_KEY,
    queryFn: () => configRepository.getPermissions(),
    staleTime: 600_000,
  })
}

export function useUpdateRolePermissions() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<void, ApiError, { roleId: string; dto: UpdateRolePermissionsDto }>({
    mutationFn: ({ roleId, dto }) => configRepository.updateRolePermissions(roleId, dto),
    onSuccess: () => {
      invalidate(ROLES_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດສິດສຳເລັດ' : locale === 'vi' ? 'Cập nhật quyền thành công' : 'Permissions updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useCreateRole() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<AppRole, ApiError, CreateRoleDto>({
    mutationFn: (dto) => configRepository.createRole(dto),
    onSuccess: () => {
      invalidate(ROLES_KEY)
      toast.success(locale === 'lo' ? 'ສ້າງບົດບາດສຳເລັດ' : locale === 'vi' ? 'Tạo vai trò thành công' : 'Role created')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateRole() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<AppRole, ApiError, { roleId: string; dto: UpdateRoleDto }>({
    mutationFn: ({ roleId, dto }) => configRepository.updateRole(roleId, dto),
    onSuccess: () => {
      invalidate(ROLES_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດບົດບາດສຳເລັດ' : locale === 'vi' ? 'Cập nhật vai trò thành công' : 'Role updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteRole() {
  const { locale, toast, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (roleId) => configRepository.deleteRole(roleId),
    onSuccess: () => {
      invalidate(ROLES_KEY)
      toast.success(locale === 'lo' ? 'ລຶບບົດບາດສຳເລັດ' : locale === 'vi' ? 'Xóa vai trò thành công' : 'Role deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
