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

  /** Tạo giao dịch mới ở trạng thái DRAFT */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const { data } = await api.post<Transaction>(this.base, dto)
    return data
  }

  /**
   * Danh sách giao dịch có phân trang.
   * Luôn truyền page (mặc định 1) để backend trả PagedResult thay vì mảng phẳng.
   */
  async getList(params?: TransactionListParams): Promise<TransactionPage> {
    const queryParams = { page: 1, pageSize: 20, ...params }
    const { data } = await api.get<RawPagedResult<Transaction>>(this.base, { params: queryParams })
    return normalizePaged(data)
  }

  /** Chi tiết giao dịch */
  async getById(id: string): Promise<Transaction> {
    const { data } = await api.get<Transaction>(`${this.base}/${id}`)
    return data
  }

  /**
   * Duyệt giao dịch PENDING → APPROVED
   * Role: BRANCH_MANAGER hoặc HQ_ADMIN
   */
  async approve(id: string, dto: ApproveTransactionDto): Promise<Transaction> {
    const { data } = await api.post<Transaction>(`${this.base}/${id}/approve`, dto)
    return data
  }

  /**
   * Từ chối giao dịch PENDING → REJECTED
   * Role: BRANCH_MANAGER hoặc HQ_ADMIN
   */
  async reject(id: string, dto: RejectTransactionDto): Promise<Transaction> {
    const { data } = await api.post<Transaction>(`${this.base}/${id}/reject`, dto)
    return data
  }

  /**
   * Hoàn tất giao dịch APPROVED → COMPLETED
   * Phải cung cấp paymentMethod
   */
  async complete(id: string, dto: CompleteTransactionDto): Promise<Transaction> {
    const { data } = await api.post<Transaction>(`${this.base}/${id}/complete`, dto)
    return data
  }
}

export const transactionRepository = new TransactionRepository()
