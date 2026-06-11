/**
 * types/common.ts
 *
 * Shared types dùng chung toàn dự án.
 * PagedResult<T> khớp với wrapper backend PagedResult<T> khi truyền ?page=N.
 */

/** Response phân trang chuẩn — backend trả khi có `?page=N` */
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
