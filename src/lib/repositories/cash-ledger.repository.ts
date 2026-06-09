import api from '@/lib/axios'
import type { DailyCashLedger, ManualEntryDto, OpeningBalanceDto, CashLedgerEntry } from '@/types/cash-ledger'

export class CashLedgerRepository {
  async getDaily(branchId: string, date?: string): Promise<DailyCashLedger> {
    const { data } = await api.get<DailyCashLedger>('/api/cash-ledger/daily', {
      params: { branchId, date },
    })
    return data
  }

  async setOpeningBalance(dto: OpeningBalanceDto): Promise<DailyCashLedger> {
    const { data } = await api.post<DailyCashLedger>('/api/cash-ledger/opening-balance', dto)
    return data
  }

  async addManualEntry(dto: ManualEntryDto): Promise<CashLedgerEntry> {
    const { data } = await api.post<CashLedgerEntry>('/api/cash-ledger/manual-entry', dto)
    return data
  }
}

export const cashLedgerRepository = new CashLedgerRepository()
