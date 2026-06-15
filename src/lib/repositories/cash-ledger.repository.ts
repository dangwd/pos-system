import api from '@/lib/axios'
import type {
  DailyCashLedger,
  ManualEntryDto,
  OpeningBalanceDto,
  CashLedgerEntry,
  CashLedgerActivitiesParams,
  CashLedgerActivitiesResult,
  CashCountSheet,
  SaveCashCountDto,
  HandoverDto,
} from '@/types/cash-ledger'

export class CashLedgerRepository {
  /** GET /daily — sổ quỹ ngày với tóm tắt số dư đầu/cuối ca */
  async getDaily(params: { branchId: string; counterId?: string; date?: string }): Promise<DailyCashLedger> {
    const { data } = await api.get<DailyCashLedger>('/api/cash-ledger/daily', { params })
    return data
  }

  /** GET /activities — danh sách bút toán có phân trang */
  async getActivities(params: CashLedgerActivitiesParams): Promise<CashLedgerActivitiesResult> {
    const { data } = await api.get<CashLedgerActivitiesResult>('/api/cash-ledger/activities', { params })
    return data
  }

  /** POST /opening-balance — ghi số dư đầu ca */
  async setOpeningBalance(dto: OpeningBalanceDto): Promise<void> {
    await api.post('/api/cash-ledger/opening-balance', dto)
  }

  /** POST /manual-entry — tạo thu/chi thủ công */
  async addManualEntry(dto: ManualEntryDto): Promise<CashLedgerEntry> {
    const { data } = await api.post<CashLedgerEntry>('/api/cash-ledger/manual-entry', dto)
    return data
  }

  /** GET /cash-count — lấy bảng kê đếm tiền */
  async getCashCount(params: { branchId: string; counterId?: string; date?: string }): Promise<CashCountSheet> {
    const { data } = await api.get<CashCountSheet>('/api/cash-ledger/cash-count', { params })
    return data
  }

  /** PUT /cash-count — lưu nháp bảng kê đếm tiền */
  async saveCashCount(dto: SaveCashCountDto): Promise<{ id: string }> {
    const { data } = await api.put<{ id: string }>('/api/cash-ledger/cash-count', dto)
    return data
  }

  /** POST /handover — chốt bàn giao ca (không thể hoàn tác) */
  async postHandover(dto: HandoverDto): Promise<{ handoverCode: string }> {
    const { data } = await api.post<{ handoverCode: string }>('/api/cash-ledger/handover', dto)
    return data
  }
}

export const cashLedgerRepository = new CashLedgerRepository()
