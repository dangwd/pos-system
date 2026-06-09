import api from '@/lib/axios'
import type { TradeTransaction, CreateTradeDto, TradeListParams, TradePage } from '@/types/trade'

export class TradeRepository {
  async create(dto: CreateTradeDto): Promise<TradeTransaction> {
    const { data } = await api.post<TradeTransaction>('/api/trade', dto)
    return data
  }

  async getList(params?: TradeListParams): Promise<TradePage> {
    const { data } = await api.get<TradePage>('/api/trade', { params })
    return data
  }

  async getById(id: string): Promise<TradeTransaction> {
    const { data } = await api.get<TradeTransaction>(`/api/trade/${id}`)
    return data
  }
}

export const tradeRepository = new TradeRepository()
