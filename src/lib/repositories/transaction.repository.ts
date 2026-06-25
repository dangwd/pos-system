/**
 * repositories/transaction.repository.ts
 *
 * Khớp với endpoints:
 *   POST   /api/transactions              → tạo & hoàn tất GD ngay (trả GUID)
 *   GET    /api/transactions              → danh sách (flat khi `limit`, paged khi `page`)
 *   GET    /api/transactions/{id}         → chi tiết
 *   POST   /api/transactions/{id}/cancel  → hủy GD đã hoàn thành
 */

import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type RawPagedResult } from '@/types/common'
import type {
  Transaction,
  TransactionPage,
  TransactionListParams,
  CreateTransactionDto,
  CancelTransactionDto,
} from '@/types/transaction'

export class TransactionRepository {
  private readonly base = '/api/transactions'

  /** Tạo giao dịch — hoàn tất ngay, trả về GUID */
  async create(dto: CreateTransactionDto): Promise<string> {
    try {
      const { data } = await api.post<string>(this.base, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Danh sách giao dịch — 2 chế độ:
   * - `limit` → mảng phẳng Transaction[] (POS lookup)
   * - `page` / không truyền → PagedResult (admin table)
   */
  async getList(params: TransactionListParams & { limit: number }): Promise<Transaction[]>
  async getList(params?: TransactionListParams): Promise<TransactionPage>
  async getList(params?: TransactionListParams): Promise<TransactionPage | Transaction[]> {
    try {
      if (params && 'limit' in params && params.limit !== undefined) {
        const { data } = await api.get<Transaction[]>(this.base, { params })
        return data
      }
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawPagedResult<Transaction>>(this.base, { params: queryParams })
      return normalizePaged(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Chi tiết giao dịch. Theo docs "Kiểm tra HĐ còn hạn" §2.1, 3 field buyback
   * (daysSincePurchase, buyBackOriginalPrice*) nằm PHẲNG trên transaction.
   * Giữ nhánh unwrap phòng BE trả wrapper `{ transaction, ...3 field }` (gộp về phẳng).
   */
  async getById(id: string): Promise<Transaction> {
    try {
      const { data } = await api.get<Transaction & { transaction?: Transaction }>(`${this.base}/${id}`)
      if (data.transaction) {
        return {
          ...data.transaction,
          daysSincePurchase: data.daysSincePurchase,
          buyBackOriginalPriceEnabled: data.buyBackOriginalPriceEnabled,
          buyBackOriginalPriceMaxDays: data.buyBackOriginalPriceMaxDays,
        }
      }
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** GET /api/transactions/export — xuất Excel theo cùng bộ lọc (tối đa 5.000 dòng) */
  async exportList(params: Omit<TransactionListParams, 'limit' | 'page' | 'pageSize'>): Promise<void> {
    try {
      const response = await api.get(`${this.base}/export`, { params, responseType: 'blob' })
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
      const a = document.createElement('a')
      a.href = url
      a.download = `giao-dich-${ts}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Hủy giao dịch đã hoàn thành */
  async cancel(id: string, dto?: CancelTransactionDto): Promise<void> {
    try {
      await api.post(`${this.base}/${id}/cancel`, dto ?? {})
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const transactionRepository = new TransactionRepository()
