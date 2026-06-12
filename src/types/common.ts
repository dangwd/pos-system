/**
 * types/common.ts
 *
 * Shared types dùng chung toàn dự án.
 * PagedResult<T> là dạng **phẳng** dùng trong FE. Backend (theo
 * "Quy ước Phân trang - Filter - Response API") trả dạng **lồng**:
 *   { data, pagination: { page, pageSize, totalItems, totalPages } }
 * → repository chuẩn hoá về PagedResult phẳng bằng `normalizePaged()`.
 */

/** Response phân trang chuẩn (phẳng) dùng trong FE */
export interface PagedResult<T> {
  /** Tổng số bản ghi khớp filter (dùng để tính số trang) */
  total: number
  /** Trang hiện tại (1-indexed) */
  page: number
  /** Số bản ghi mỗi trang */
  pageSize: number
  /** Mảng bản ghi của trang hiện tại */
  data: T[]
}

/** Metadata phân trang theo quy ước backend */
export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

/** Dạng response phân trang backend có thể trả: lồng (quy ước) hoặc phẳng (cũ). */
export type RawPagedResult<T> =
  | { data: T[]; pagination: PaginationMeta }
  | { data: T[]; total: number; page: number; pageSize: number }

/**
 * Chuẩn hoá response phân trang về PagedResult phẳng. An toàn với cả 3 dạng:
 *   - lồng `{ data, pagination: {...} }` (theo Quy ước Phân trang)
 *   - phẳng `{ data, total, page, pageSize }` (cũ)
 *   - mảng thuần `T[]` (endpoint không phân trang) → coi như 1 trang đầy đủ
 */
export function normalizePaged<T>(raw: RawPagedResult<T> | T[]): PagedResult<T> {
  if (Array.isArray(raw)) {
    return { data: raw, total: raw.length, page: 1, pageSize: raw.length || 20 }
  }
  if ('pagination' in raw) {
    const { page, pageSize, totalItems } = raw.pagination
    return { data: raw.data, total: totalItems, page, pageSize }
  }
  return { data: raw.data, total: raw.total, page: raw.page, pageSize: raw.pageSize }
}
