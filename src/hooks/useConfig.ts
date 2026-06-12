import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { configRepository } from '@/lib/repositories/config.repository'
import { getErrorMessage } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type { AppLocale } from '@/lib/errors'
import type {
  PriceConfig,
  UpdatePriceConfigDto,
  ExchangeRate,
  UpdateExchangeRateDto,
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
  Permission,
  UpdateRolePermissionsDto,
  CreateRoleDto,
  UpdateRoleDto,
} from '@/types/config'

// ─── Query keys ───────────────────────────────────────────────────────────────

const PRICES_KEY = ['config', 'prices'] as const
const EXCHANGE_RATES_KEY = ['config', 'exchange-rates'] as const
const STONE_RULES_KEY = ['config', 'stone-price-rules'] as const
const WEIGHT_UNITS_KEY = ['config', 'weight-units'] as const
const GOLD_PURITIES_KEY = ['config', 'gold-purities'] as const

function useConfigBase() {
  const locale = useLocale() as AppLocale
  const qc = useQueryClient()
  const invalidate = (key: readonly string[]) => qc.invalidateQueries({ queryKey: key })
  return { locale, invalidate }
}

// ─── Bảng giá ─────────────────────────────────────────────────────────────────

export function useConfigPrices() {
  return useQuery({
    queryKey: PRICES_KEY,
    queryFn: () => configRepository.getPrices(),
    staleTime: 60_000,
  })
}

export function useUpdatePrices() {
  const { locale, invalidate } = useConfigBase()
  return useMutation<PriceConfig, ApiError, UpdatePriceConfigDto>({
    mutationFn: (dto) => configRepository.updatePrices(dto),
    onSuccess: () => {
      invalidate(PRICES_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດລາຄາສຳເລັດ' : locale === 'vi' ? 'Cập nhật bảng giá thành công' : 'Prices updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

// ─── Tỷ giá ───────────────────────────────────────────────────────────────────

export function useExchangeRates() {
  return useQuery({
    queryKey: EXCHANGE_RATES_KEY,
    queryFn: () => configRepository.getExchangeRates(),
    staleTime: 60_000,
  })
}

export function useUpdateExchangeRate() {
  const { locale, invalidate } = useConfigBase()
  return useMutation<ExchangeRate, ApiError, UpdateExchangeRateDto>({
    mutationFn: (dto) => configRepository.updateExchangeRate(dto),
    onSuccess: () => {
      invalidate(EXCHANGE_RATES_KEY)
      toast.success(locale === 'lo' ? 'ອັບເດດອັດຕາສຳເລັດ' : locale === 'vi' ? 'Cập nhật tỷ giá thành công' : 'Exchange rate updated')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
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
  const { locale, invalidate } = useConfigBase()
  return useMutation<StonePriceRule, ApiError, CreateStonePriceRuleDto>({
    mutationFn: (dto) => configRepository.createStonePriceRule(dto),
    onSuccess: () => invalidate(STONE_RULES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateStonePriceRule() {
  const { locale, invalidate } = useConfigBase()
  return useMutation<StonePriceRule, ApiError, { id: string; dto: UpdateStonePriceRuleDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateStonePriceRule(id, dto),
    onSuccess: () => invalidate(STONE_RULES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteStonePriceRule() {
  const { locale, invalidate } = useConfigBase()
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
  const { locale, invalidate } = useConfigBase()
  return useMutation<WeightUnit, ApiError, CreateWeightUnitDto>({
    mutationFn: (dto) => configRepository.createWeightUnit(dto),
    onSuccess: () => invalidate(WEIGHT_UNITS_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateWeightUnit() {
  const { locale, invalidate } = useConfigBase()
  return useMutation<WeightUnit, ApiError, { id: string; dto: UpdateWeightUnitDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateWeightUnit(id, dto),
    onSuccess: () => invalidate(WEIGHT_UNITS_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteWeightUnit() {
  const { locale, invalidate } = useConfigBase()
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
  const { locale, invalidate } = useConfigBase()
  return useMutation<GoldPurity, ApiError, CreateGoldPurityDto>({
    mutationFn: (dto) => configRepository.createGoldPurity(dto),
    onSuccess: () => invalidate(GOLD_PURITIES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useUpdateGoldPurity() {
  const { locale, invalidate } = useConfigBase()
  return useMutation<GoldPurity, ApiError, { id: string; dto: UpdateGoldPurityDto }>({
    mutationFn: ({ id, dto }) => configRepository.updateGoldPurity(id, dto),
    onSuccess: () => invalidate(GOLD_PURITIES_KEY),
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}

export function useDeleteGoldPurity() {
  const { locale, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => configRepository.deleteGoldPurity(id),
    onSuccess: () => invalidate(GOLD_PURITIES_KEY),
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
  const { locale, invalidate } = useConfigBase()
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
  const { locale, invalidate } = useConfigBase()
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
  const { locale, invalidate } = useConfigBase()
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
  const { locale, invalidate } = useConfigBase()
  return useMutation<void, ApiError, string>({
    mutationFn: (roleId) => configRepository.deleteRole(roleId),
    onSuccess: () => {
      invalidate(ROLES_KEY)
      toast.success(locale === 'lo' ? 'ລຶບບົດບາດສຳເລັດ' : locale === 'vi' ? 'Xóa vai trò thành công' : 'Role deleted')
    },
    onError: (err) => toast.error(getErrorMessage(err.code, locale)),
  })
}
