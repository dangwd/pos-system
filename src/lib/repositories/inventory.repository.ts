/**
 * repositories/inventory.repository.ts
 *
 * Khớp với endpoints:
 *   GET   /api/inventory                    → danh sách tồn kho (filter)
 *   GET   /api/inventory/{id}               → chi tiết 1 mục kho
 *   POST  /api/inventory/{id}/adjust        → điều chỉnh tồn kho thủ công
 *   PATCH /api/inventory/{id}/status        → cập nhật trạng thái mục kho
 *   GET   /api/inventory/adjustments        → lịch sử điều chỉnh kho
 */

import api from '@/lib/axios'
import type {
  InventoryItem,
  InventoryAdjustment,
  AdjustInventoryDto,
  UpdateInventoryStatusDto,
  InventoryListParams,
} from '@/types/inventory'
import type { PagedResult } from '@/types/common'

export class InventoryRepository {
  private readonly base = '/api/inventory'

  /**
   * Danh sách tồn kho có phân trang — luôn truyền page (mặc định 1).
   * Backend trả PagedResult<InventoryItem> khi có `page` param.
   */
  async getList(params?: InventoryListParams): Promise<PagedResult<InventoryItem>> {
    const queryParams = { page: 1, pageSize: 20, ...params }
    const { data } = await api.get<PagedResult<InventoryItem>>(this.base, { params: queryParams })
    return data
  }

  /** Chi tiết 1 mục kho */
  async getById(id: string): Promise<InventoryItem> {
    const { data } = await api.get<InventoryItem>(`${this.base}/${id}`)
    return data
  }

  /**
   * Điều chỉnh tồn kho thủ công (In/Out + lý do)
   * Role: BRANCH_MANAGER (cần duyệt) hoặc HQ_ADMIN
   */
  async adjust(id: string, dto: AdjustInventoryDto): Promise<InventoryItem> {
    const { data } = await api.post<InventoryItem>(`${this.base}/${id}/adjust`, dto)
    return data
  }

  /** Cập nhật trạng thái mục kho (Available/Reserved/Sold/Returned) */
  async updateStatus(id: string, dto: UpdateInventoryStatusDto): Promise<InventoryItem> {
    const { data } = await api.patch<InventoryItem>(`${this.base}/${id}/status`, dto)
    return data
  }

  /** Lịch sử điều chỉnh kho */
  async getAdjustments(inventoryItemId?: string): Promise<InventoryAdjustment[]> {
    const { data } = await api.get<InventoryAdjustment[]>(`${this.base}/adjustments`, {
      params: inventoryItemId ? { inventoryItemId } : undefined,
    })
    return data
  }
}

export const inventoryRepository = new InventoryRepository()
