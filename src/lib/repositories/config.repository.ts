/**
 * repositories/config.repository.ts
 *
 * Khớp với endpoints:
 *   GET  /api/config/prices           → bảng giá hiện tại
 *   POST /api/config/prices           → cập nhật bảng giá (tạo version mới)
 *   GET  /api/config/exchange-rates   → tỷ giá tất cả ngoại tệ
 *   GET  /api/config/stone-prices     → bảng phí đá đính kèm
 *   GET  /api/config/weight-units     → đơn vị đo lường
 *   GET  /api/config/gold-purities    → danh mục tuổi vàng
 */

import api from '@/lib/axios'
import type {
  PriceConfig,
  ExchangeRate,
  UpdateExchangeRateDto,
  StonePriceRule,
  CreateStonePriceRuleDto,
  WeightUnit,
  GoldPurity,
  CreateGoldPurityDto,
  UpdatePriceConfigDto,
} from '@/types/config'

export class ConfigRepository {
  /** Bảng giá vàng/bạc hiện tại — cache 1 phút (giá cập nhật theo giờ) */
  async getPrices(): Promise<PriceConfig> {
    const { data } = await api.get<PriceConfig>('/api/config/prices')
    return data
  }

  /**
   * Cập nhật bảng giá — tạo version mới với effectiveFrom = now
   * Role: HQ_ADMIN hoặc SYSTEM_ADMIN
   */
  async updatePrices(payload: Omit<PriceConfig, 'id' | 'updatedBy' | 'updatedAt' | 'effectiveFrom'>): Promise<PriceConfig> {
    const { data } = await api.post<PriceConfig>('/api/config/prices', payload)
    return data
  }

  /** Tỷ giá tất cả ngoại tệ */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    const { data } = await api.get<ExchangeRate[]>('/api/config/exchange-rates')
    return data
  }

  /** Bảng phí đá đính kèm theo bậc trọng lượng */
  async getStonePriceRules(): Promise<StonePriceRule[]> {
    const { data } = await api.get<StonePriceRule[]>('/api/config/stone-prices')
    return data
  }

  /** Danh sách đơn vị đo lường (Chỉ, Gram, Baht...) */
  async getWeightUnits(): Promise<WeightUnit[]> {
    const { data } = await api.get<WeightUnit[]>('/api/config/weight-units')
    return data
  }

  /** Danh sách tuổi vàng (9999, 750, 585...) */
  async getGoldPurities(): Promise<GoldPurity[]> {
    const { data } = await api.get<GoldPurity[]>('/api/config/gold-purities')
    return data
  }

  async updatePriceConfig(dto: UpdatePriceConfigDto): Promise<PriceConfig> {
    const { data } = await api.post<PriceConfig>('/api/config/prices', dto)
    return data
  }

  async updateExchangeRate(dto: UpdateExchangeRateDto): Promise<ExchangeRate> {
    const { data } = await api.post<ExchangeRate>('/api/config/exchange-rates', dto)
    return data
  }

  async createStonePriceRule(dto: CreateStonePriceRuleDto): Promise<StonePriceRule> {
    const { data } = await api.post<StonePriceRule>('/api/config/stone-price-rules', dto)
    return data
  }

  async deleteStonePriceRule(id: string): Promise<void> {
    await api.delete(`/api/config/stone-price-rules/${id}`)
  }

  async updateWeightUnit(maTocDoc: string, gramPerUnit: number): Promise<WeightUnit> {
    const { data } = await api.put<WeightUnit>(`/api/config/weight-units/${maTocDoc}`, { gramPerUnit })
    return data
  }

  async createGoldPurity(dto: CreateGoldPurityDto): Promise<GoldPurity> {
    const { data } = await api.post<GoldPurity>('/api/config/gold-purities', dto)
    return data
  }
}

export const configRepository = new ConfigRepository()
