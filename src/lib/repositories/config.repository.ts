import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type RawPagedResult, type PagedResult } from '@/types/common'
import type {
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
  Permission,
  UpdateRolePermissionsDto,
  CreateRoleDto,
  UpdateRoleDto,
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
} from '@/types/config'

/** Shape thô của endpoint history: dùng key `items` (FE PagedResult dùng `data`). */
type RawSessionPage<T> = { total: number; page: number; pageSize: number; items: T[] }

/** Map response history (key `items`) → PagedResult phẳng của FE (key `data`). */
function toSessionPage<T>(raw: RawSessionPage<T> | undefined, query: ExchangeHistoryQuery): PagedResult<T> {
  return {
    data: raw?.items ?? [],
    total: raw?.total ?? 0,
    page: raw?.page ?? query.page ?? 1,
    pageSize: raw?.pageSize ?? query.pageSize ?? 20,
  }
}

export class ConfigRepository {

  // ─── Bảng giá ──────────────────────────────────────────────────────────────

  // ─── Bảng giá (nhiều bảng song song) ──────────────────────────────────────

  async getPriceTables(): Promise<PriceTable[]> {
    try {
      const { data } = await api.get<PriceTable[] | RawPagedResult<PriceTable>>('/api/price-tables')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  /** Bảng giá đang áp dụng cho user hiện tại (BE resolve theo JWT: chi nhánh → toàn hệ thống). */
  async getActivePriceTable(): Promise<PriceTable> {
    try {
      const { data } = await api.get<PriceTable>('/api/price-tables/active')
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async createPriceTable(dto: CreatePriceTableDto): Promise<PriceTable> {
    try {
      const { data } = await api.post<PriceTable>('/api/price-tables', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async togglePriceTableActive(id: string, dto: TogglePriceTableActiveDto): Promise<PriceTable> {
    try {
      const { data } = await api.patch<PriceTable>(`/api/price-tables/${id}`, dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Tỷ giá LAK (exchange_rates) ────────────────────────────────────────────

  /** GET /api/config/exchange-rates — tỷ giá hiện hành mỗi loại ngoại tệ */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    try {
      const { data } = await api.get<ExchangeRate[] | RawPagedResult<ExchangeRate>>('/api/config/exchange-rates')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  /** POST /api/config/exchange-rates — cập nhật 1 loại (tạo bản ghi mới, sessionId riêng) */
  async updateExchangeRate(dto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    try {
      const { data } = await api.post<ExchangeRate>('/api/config/exchange-rates', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  /** POST /api/config/exchange-rates/bulk — cập nhật nhiều loại, chung 1 sessionId */
  async bulkUpdateExchangeRates(dto: BulkUpdateExchangeRatesRequest): Promise<ExchangeRate[]> {
    try {
      const { data } = await api.post<ExchangeRate[]>('/api/config/exchange-rates/bulk', dto)
      return data ?? []
    } catch (err) { throw handleAxiosError(err) }
  }

  /** GET /api/config/exchange-rates/history — lịch sử tỷ giá LAK theo phiên (phân trang + lọc) */
  async getExchangeRateHistory(query: ExchangeHistoryQuery = {}): Promise<PagedResult<ExchangeRateSession>> {
    try {
      const { data } = await api.get<RawSessionPage<ExchangeRateSession>>(
        '/api/config/exchange-rates/history',
        { params: { page: 1, pageSize: 20, ...query } },
      )
      return toSessionPage(data, query)
    } catch (err) { throw handleAxiosError(err) }
  }

  // ─── Rate Graph — cặp tỷ giá (exchange_rate_pairs) ──────────────────────────

  /** GET /api/config/exchange-rate-pairs[?from=] — cặp tỷ giá; truyền `from` để có cross-rate qua LAK */
  async getExchangeRatePairs(from?: string): Promise<ExchangeRatePair[]> {
    try {
      const { data } = await api.get<ExchangeRatePair[]>('/api/config/exchange-rate-pairs', {
        params: from ? { from } : undefined,
      })
      return data ?? []
    } catch (err) { throw handleAxiosError(err) }
  }

  /** PUT /api/config/exchange-rate-pairs/{from}/{to} — upsert 1 cặp */
  async updateExchangeRatePair(from: string, to: string, dto: UpdateExchangeRatePairDto): Promise<ExchangeRatePair> {
    try {
      const { data } = await api.put<ExchangeRatePair>(
        `/api/config/exchange-rate-pairs/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
        dto,
      )
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  /** POST /api/config/exchange-rate-pairs/bulk — upsert nhiều cặp, chung 1 sessionId */
  async bulkUpdateExchangeRatePairs(dto: BulkUpdateExchangeRatePairsRequest): Promise<ExchangeRatePair[]> {
    try {
      const { data } = await api.post<ExchangeRatePair[]>('/api/config/exchange-rate-pairs/bulk', dto)
      return data ?? []
    } catch (err) { throw handleAxiosError(err) }
  }

  /** GET /api/config/exchange-rate-pairs/history — lịch sử Rate Graph theo phiên (phân trang + lọc) */
  async getExchangeRatePairHistory(query: ExchangeHistoryQuery = {}): Promise<PagedResult<ExchangeRatePairSession>> {
    try {
      const { data } = await api.get<RawSessionPage<ExchangeRatePairSession>>(
        '/api/config/exchange-rate-pairs/history',
        { params: { page: 1, pageSize: 20, ...query } },
      )
      return toSessionPage(data, query)
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

  // ─── Currencies — Ngoại tệ ─────────────────────────────────────────────────

  async getCurrencies(): Promise<Currency[]> {
    try {
      const { data } = await api.get<Currency[] | RawPagedResult<Currency>>('/api/currencies')
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) { throw handleAxiosError(err) }
  }

  async createCurrency(dto: CreateCurrencyDto): Promise<Currency> {
    try {
      const { data } = await api.post<Currency>('/api/currencies', dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto): Promise<Currency> {
    try {
      const { data } = await api.put<Currency>(`/api/currencies/${id}`, dto)
      return data
    } catch (err) { throw handleAxiosError(err) }
  }

  async deleteCurrency(id: string): Promise<void> {
    try {
      await api.delete(`/api/currencies/${id}`)
    } catch (err) { throw handleAxiosError(err) }
  }
}

export const configRepository = new ConfigRepository()
