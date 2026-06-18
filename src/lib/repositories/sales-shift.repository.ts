/**
 * repositories/sales-shift.repository.ts
 *
 * Khớp với endpoints:
 *   GET    /api/sales-shifts/active       → ca đang mở của nhân viên hiện tại
 *   POST   /api/sales-shifts/open         → mở ca mới
 *   POST   /api/sales-shifts/{id}/close   → chốt ca
 *   GET    /api/sales-shifts              → danh sách ca (SALES_SHIFT_MANAGE)
 *   GET    /api/sales-shifts/{id}         → chi tiết ca (SALES_SHIFT_MANAGE)
 *   GET    /api/sales-shifts/{id}/transactions → GD trong ca (SALES_SHIFT_MANAGE)
 */

import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type { PagedResult } from '@/types/common'
import type {
  ActiveShiftResponse,
  CloseShiftRequest,
  OpenShiftRequest,
  SalesShiftDetailDto,
  SalesShiftListItem,
  SalesShiftListParams,
  ShiftTransactionItem,
} from '@/types/sales-shift'

/** Dạng response phân trang thực tế từ backend (items + totalCount) */
interface RawItemsResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

function toPagedResult<T>(raw: RawItemsResult<T>): PagedResult<T> {
  return { data: raw.items, total: raw.totalCount, page: raw.page, pageSize: raw.pageSize }
}

export class SalesShiftRepository {
  private readonly base = '/api/sales-shifts'

  /** Ca đang mở của nhân viên hiện tại — dùng để check trước khi tạo GD */
  async getActive(): Promise<ActiveShiftResponse> {
    try {
      const { data } = await api.get<ActiveShiftResponse>(`${this.base}/active`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Mở ca mới */
  async open(dto: OpenShiftRequest): Promise<SalesShiftDetailDto> {
    try {
      const { data } = await api.post<SalesShiftDetailDto>(`${this.base}/open`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Chốt ca — trả về SalesShiftDetailDto đầy đủ với summary */
  async close(id: string, dto: CloseShiftRequest): Promise<SalesShiftDetailDto> {
    try {
      const { data } = await api.post<SalesShiftDetailDto>(`${this.base}/${id}/close`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Danh sách ca (yêu cầu permission SALES_SHIFT_MANAGE) */
  async getList(params?: SalesShiftListParams): Promise<PagedResult<SalesShiftListItem>> {
    try {
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawItemsResult<SalesShiftListItem>>(this.base, { params: queryParams })
      return toPagedResult(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Chi tiết ca kèm summary (yêu cầu permission SALES_SHIFT_MANAGE) */
  async getById(id: string): Promise<SalesShiftDetailDto> {
    try {
      const { data } = await api.get<SalesShiftDetailDto>(`${this.base}/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Danh sách GD trong ca (yêu cầu permission SALES_SHIFT_MANAGE) */
  async getTransactions(id: string, params?: { q?: string; page?: number; pageSize?: number }): Promise<PagedResult<ShiftTransactionItem>> {
    try {
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawItemsResult<ShiftTransactionItem>>(
        `${this.base}/${id}/transactions`,
        { params: queryParams },
      )
      return toPagedResult(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const salesShiftRepository = new SalesShiftRepository()
