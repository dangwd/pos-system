import api from '@/lib/axios'
import type {
  DailyCashLedger,
  ManualEntryRequest,
  ManualEntryResponse,
  OpeningBalanceDto,
  CashLedgerActivitiesParams,
  CashLedgerActivitiesResult,
  CashVoucherDto,
  VoucherReason,
  CreateVoucherDto,
  VoucherListParams,
  VoucherListResponse,
  CashCountSheet,
  SaveCashCountDto,
  HandoverDto,
  CashDirection,
} from '@/types/cash-ledger'

export class CashLedgerRepository {
  /** GET /daily — tổng hợp số dư đầu/cuối và tổng thu/chi trong ngày */
  async getDaily(params: { branchId: string; counterId?: string; date?: string }): Promise<DailyCashLedger> {
    const { data } = await api.get<DailyCashLedger>('/api/cash-ledger/daily', { params })
    return data
  }

  /** GET /activities — danh sách bút toán rút gọn (không có amountLak) */
  async getActivities(params: CashLedgerActivitiesParams): Promise<CashLedgerActivitiesResult> {
    const { data } = await api.get<CashLedgerActivitiesResult>('/api/cash-ledger/activities', { params })
    return data
  }

  /** GET /activities/{id} — chi tiết đầy đủ một bút toán */
  async getActivityById(id: string): Promise<CashVoucherDto> {
    const { data } = await api.get<CashVoucherDto>(`/api/cash-ledger/activities/${id}`)
    return data
  }

  /** POST /opening-balance — ghi số dư đầu ca */
  async setOpeningBalance(dto: OpeningBalanceDto): Promise<void> {
    await api.post('/api/cash-ledger/opening-balance', dto)
  }

  /** POST /manual-entry — tạo thu/chi thủ công nhanh (không qua lý do) */
  async addManualEntry(dto: ManualEntryRequest): Promise<ManualEntryResponse> {
    const { data } = await api.post<ManualEntryResponse>('/api/cash-ledger/manual-entry', dto)
    return data
  }

  /** GET /voucher-reasons — danh sách lý do phiếu thu/chi */
  async getVoucherReasons(direction?: CashDirection): Promise<VoucherReason[]> {
    const { data } = await api.get<VoucherReason[]>('/api/cash-ledger/voucher-reasons', {
      params: direction ? { direction } : undefined,
    })
    return data
  }

  /** GET /vouchers — danh sách phiếu thu/chi có đầy đủ thông tin */
  async getVouchers(params: VoucherListParams): Promise<VoucherListResponse> {
    const { data } = await api.get<VoucherListResponse>('/api/cash-ledger/vouchers', { params })
    return data
  }

  /** POST /vouchers — tạo phiếu thu/chi chính thức (có lý do) */
  async createVoucher(dto: CreateVoucherDto): Promise<CashVoucherDto> {
    const { data } = await api.post<CashVoucherDto>('/api/cash-ledger/vouchers', dto)
    return data
  }

  /** GET /vouchers/{id} — chi tiết phiếu thu/chi */
  async getVoucherById(id: string): Promise<CashVoucherDto> {
    const { data } = await api.get<CashVoucherDto>(`/api/cash-ledger/vouchers/${id}`)
    return data
  }

  /** GET /cash-count — bảng kê đếm tiền ca hiện tại */
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
