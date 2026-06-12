import api from '@/lib/axios'
import { normalizePaged, type RawPagedResult } from '@/types/common'
import type { TradeTransaction, CreateTradeDto, TradeListParams, TradePage } from '@/types/trade'

export class TradeRepository {
  async create(dto: CreateTradeDto): Promise<TradeTransaction> {
    const { data } = await api.post<TradeTransaction>('/api/trade', dto)
    return data
  }

  async getList(params?: TradeListParams): Promise<TradePage> {
    // Trade luôn phân trang (page mặc định 1 ở backend — xem Quy ước §6).
    const { data } = await api.get<RawPagedResult<TradeTransaction>>('/api/trade', { params })
    return normalizePaged(data)
  }

  async getById(id: string): Promise<TradeTransaction> {
    const { data } = await api.get<TradeTransaction>(`/api/trade/${id}`)
    return data
  }
}

export const tradeRepository = new TradeRepository()
