/**
 * repositories/transaction.repository.ts
 *
 * Khớp với endpoints:
 *   POST   /api/transactions                    → tạo giao dịch DRAFT
 *   GET    /api/transactions                    → danh sách (phân trang)
 *   GET    /api/transactions/{id}               → chi tiết
 *   POST   /api/transactions/{id}/approve       → duyệt (PENDING → APPROVED)
 *   POST   /api/transactions/{id}/reject        → từ chối (PENDING → REJECTED)
 *   POST   /api/transactions/{id}/complete      → hoàn tất (APPROVED → COMPLETED)
 */

import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type RawPagedResult } from '@/types/common'
import type {
  Transaction,
  TransactionPage,
  TransactionListParams,
  CreateTransactionDto,
  ApproveTransactionDto,
  RejectTransactionDto,
  CompleteTransactionDto,
} from '@/types/transaction'

export class TransactionRepository {
  private readonly base = '/api/transactions'

  /** Tạo giao dịch mới — API trả về GUID (string) */
  async create(dto: CreateTransactionDto): Promise<string> {
    try {
      const { data } = await api.post<string>(this.base, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Danh sách giao dịch có phân trang.
   * Luôn truyền page (mặc định 1) để backend trả PagedResult thay vì mảng phẳng.
   */
  async getList(params?: TransactionListParams): Promise<TransactionPage> {
    try {
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawPagedResult<Transaction>>(this.base, { params: queryParams })
      return normalizePaged(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Chi tiết giao dịch */
  async getById(id: string): Promise<Transaction> {
    try {
      const { data } = await api.get<Transaction>(`${this.base}/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Duyệt giao dịch PENDING → APPROVED */
  async approve(id: string, dto: ApproveTransactionDto): Promise<Transaction> {
    try {
      const { data } = await api.post<Transaction>(`${this.base}/${id}/approve`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Từ chối giao dịch PENDING → REJECTED */
  async reject(id: string, dto: RejectTransactionDto): Promise<Transaction> {
    try {
      const { data } = await api.post<Transaction>(`${this.base}/${id}/reject`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Hoàn tất giao dịch APPROVED → COMPLETED */
  async complete(id: string, dto: CompleteTransactionDto): Promise<Transaction> {
    try {
      const { data } = await api.post<Transaction>(`${this.base}/${id}/complete`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const transactionRepository = new TransactionRepository()
