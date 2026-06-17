/**
 * repositories/inventory.repository.ts
 *
 * Khớp với endpoints:
 *   GET   /api/inventory                    → danh sách tồn kho (filter + phân trang)
 *   GET   /api/inventory/{id}               → chi tiết 1 mục kho
 *   POST  /api/inventory/{id}/adjust        → điều chỉnh tồn kho thủ công (IN/OUT)
 *   PATCH /api/inventory/{id}/status        → cập nhật trạng thái mục kho
 *   GET   /api/inventory/adjustments        → lịch sử điều chỉnh kho (ADJ-xxx)
 */

import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type {
  InventoryItem,
  InventoryAdjustment,
  AdjustInventoryDto,
  AdjustInventoryResult,
  UpdateInventoryStatusDto,
  BulkUpdateInventoryDto,
  BulkUpdateInventoryResult,
  CreateInventoryAdjustmentDto,
  CreateInventoryAdjustmentResult,
  InventoryListParams,
  InventoryAdjustmentParams,
} from '@/types/inventory'
import { normalizePaged, type PagedResult, type RawPagedResult } from '@/types/common'

export class InventoryRepository {
  private readonly base = '/api/inventory'

  /**
   * Danh sách tồn kho có phân trang — luôn truyền page (mặc định 1).
   * Backend trả PagedResult<InventoryItem> khi có `page` param.
   */
  async getList(params?: InventoryListParams): Promise<PagedResult<InventoryItem>> {
    try {
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawPagedResult<InventoryItem>>(this.base, { params: queryParams })
      return normalizePaged(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Danh sách tồn kho dạng mảng (KHÔNG phân trang) — dùng cho catalog theo
   * chi nhánh & picker. Backend có thể trả mảng hoặc paged object — normalize về mảng.
   */
  async getAll(params?: Omit<InventoryListParams, 'page' | 'pageSize'>): Promise<InventoryItem[]> {
    try {
      const { data } = await api.get<InventoryItem[] | RawPagedResult<InventoryItem>>(this.base, { params })
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Chi tiết 1 mục kho */
  async getById(id: string): Promise<InventoryItem> {
    try {
      const { data } = await api.get<InventoryItem>(`${this.base}/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Điều chỉnh tồn kho thủ công 1 mục (IN = nhập / OUT = xuất + lý do bắt buộc).
   * Role: InventoryManage (Manager, SystemAdmin). Trả về `{ item, adjustment }`.
   */
  async adjust(id: string, dto: AdjustInventoryDto): Promise<AdjustInventoryResult> {
    try {
      const { data } = await api.post<AdjustInventoryResult>(`${this.base}/${id}/adjust`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Tạo MỘT phiếu điều chỉnh tồn kho nhiều dòng (nhập/xuất) — POST /api/inventory/adjustments.
   * Phiếu thuần một chiều, atomic: chỉ cần một dòng lỗi (không tìm thấy / thiếu tồn) thì cả phiếu bị từ chối.
   * Trả về phiếu vừa tạo (header + lines). Role: InventoryManage (Manager, SystemAdmin).
   */
  async createAdjustment(dto: CreateInventoryAdjustmentDto): Promise<CreateInventoryAdjustmentResult> {
    try {
      const { data } = await api.post<CreateInventoryAdjustmentResult>(`${this.base}/adjustments`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Cập nhật trạng thái mục kho (TiepNhan | DaDinhGia | TrenQuay | DaBan | ChuyenXuong) */
  async updateStatus(id: string, dto: UpdateInventoryStatusDto): Promise<InventoryItem> {
    try {
      const { data } = await api.patch<InventoryItem>(`${this.base}/${id}/status`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Lịch sử điều chỉnh kho */
  async getAdjustments(params?: InventoryAdjustmentParams): Promise<PagedResult<InventoryAdjustment>> {
    try {
      const queryParams = { page: 1, pageSize: 20, ...params }
      const { data } = await api.get<RawPagedResult<InventoryAdjustment>>(`${this.base}/adjustments`, { params: queryParams })
      return normalizePaged(data)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /** Chi tiết một phiếu điều chỉnh (header + lines) */
  async getAdjustmentById(id: string): Promise<InventoryAdjustment> {
    try {
      const { data } = await api.get<InventoryAdjustment>(`${this.base}/adjustments/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Cập nhật trạng thái nhiều mục kho cùng lúc (partial success).
   * Kiểm tra `notFoundIds` để phát hiện item không tồn tại.
   * Role: InventoryManage (Manager, SystemAdmin).
   */
  async bulkUpdateStatus(dto: BulkUpdateInventoryDto): Promise<BulkUpdateInventoryResult> {
    try {
      const { data } = await api.patch<BulkUpdateInventoryResult>(`${this.base}/bulk`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const inventoryRepository = new InventoryRepository()
