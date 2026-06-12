import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type RawPagedResult } from '@/types/common'
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

export class ConfigRepository {

  // ─── Bảng giá ──────────────────────────────────────────────────────────────

  async getPrices(): Promise<PriceConfig> {
    try {
      const { data } = await api.get<PriceConfig>('/api/config/prices')
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async getPriceHistory(limit = 20): Promise<PriceConfig[]> {
    try {
      const { data } = await api.get<PriceConfig[] | RawPagedResult<PriceConfig>>('/api/config/prices/history', { params: { limit } })
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updatePrices(dto: UpdatePriceConfigDto): Promise<PriceConfig> {
    try {
      const { data } = await api.post<PriceConfig>('/api/config/prices', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Tỷ giá ngoại tệ ───────────────────────────────────────────────────────

  async getExchangeRates(): Promise<ExchangeRate[]> {
    try {
      const { data } = await api.get<ExchangeRate[] | RawPagedResult<ExchangeRate>>('/api/config/exchange-rates')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateExchangeRate(dto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    try {
      const { data } = await api.post<ExchangeRate>('/api/config/exchange-rates', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Bảng phí đá ───────────────────────────────────────────────────────────

  async getStonePriceRules(): Promise<StonePriceRule[]> {
    try {
      const { data } = await api.get<StonePriceRule[] | RawPagedResult<StonePriceRule>>('/api/config/stone-price-rules')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async createStonePriceRule(dto: CreateStonePriceRuleDto): Promise<StonePriceRule> {
    try {
      const { data } = await api.post<StonePriceRule>('/api/config/stone-price-rules', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateStonePriceRule(id: string, dto: UpdateStonePriceRuleDto): Promise<StonePriceRule> {
    try {
      const { data } = await api.put<StonePriceRule>(`/api/config/stone-price-rules/${id}`, dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async deleteStonePriceRule(id: string): Promise<void> {
    try {
      await api.delete(`/api/config/stone-price-rules/${id}`)
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Đơn vị trọng lượng ────────────────────────────────────────────────────

  async getWeightUnits(): Promise<WeightUnit[]> {
    try {
      const { data } = await api.get<WeightUnit[] | RawPagedResult<WeightUnit>>('/api/config/weight-units')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async createWeightUnit(dto: CreateWeightUnitDto): Promise<WeightUnit> {
    try {
      const { data } = await api.post<WeightUnit>('/api/config/weight-units', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateWeightUnit(id: string, dto: UpdateWeightUnitDto): Promise<WeightUnit> {
    try {
      const { data } = await api.put<WeightUnit>(`/api/config/weight-units/${id}`, dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async deleteWeightUnit(id: string): Promise<void> {
    try {
      await api.delete(`/api/config/weight-units/${id}`)
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Hàm lượng vàng / bạc ──────────────────────────────────────────────────

  async getGoldPurities(): Promise<GoldPurity[]> {
    try {
      const { data } = await api.get<GoldPurity[] | RawPagedResult<GoldPurity>>('/api/config/gold-purities')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async createGoldPurity(dto: CreateGoldPurityDto): Promise<GoldPurity> {
    try {
      const { data } = await api.post<GoldPurity>('/api/config/gold-purities', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateGoldPurity(id: string, dto: UpdateGoldPurityDto): Promise<GoldPurity> {
    try {
      const { data } = await api.put<GoldPurity>(`/api/config/gold-purities/${id}`, dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async deleteGoldPurity(id: string): Promise<void> {
    try {
      await api.delete(`/api/config/gold-purities/${id}`)
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Roles & Permissions ──────────────────────────────────────────────────

  async getRoles(): Promise<AppRole[]> {
    try {
      const { data } = await api.get<AppRole[] | RawPagedResult<AppRole>>('/api/config/roles')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async getPermissions(): Promise<Permission[]> {
    try {
      const { data } = await api.get<Permission[] | RawPagedResult<Permission>>('/api/config/permissions')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto): Promise<void> {
    try {
      await api.put(`/api/config/roles/${roleId}/permissions`, dto)
    } catch (err) { throw handleAxiosError(err) }
  }

  async createRole(dto: CreateRoleDto): Promise<AppRole> {
    try {
      const { data } = await api.post<AppRole>('/api/config/roles', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateRole(roleId: string, dto: UpdateRoleDto): Promise<AppRole> {
    try {
      const { data } = await api.put<AppRole>(`/api/config/roles/${roleId}`, dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async deleteRole(roleId: string): Promise<void> {
    try {
      await api.delete(`/api/config/roles/${roleId}`)
    } catch (err) { throw handleAxiosError(err) }
  }
}

export const configRepository = new ConfigRepository()
