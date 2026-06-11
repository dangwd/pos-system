/**
 * repositories/customer.repository.ts
 *
 * Khớp với endpoints:
 *   GET  /api/customers           → tìm kiếm khách hàng
 *   GET  /api/customers/{id}      → chi tiết khách hàng
 *   POST /api/customers           → tạo khách hàng mới
 */

import api from '@/lib/axios'
import { normalizePaged, type PagedResult, type RawPagedResult } from '@/types/common'
import type {
  Customer,
  CreateCustomerDto,
  CustomerSearchParams,
  CustomerListParams,
} from '@/types/customer'

export class CustomerRepository {
  private readonly base = '/api/customers'

  /**
   * Tìm kiếm khách hàng — trả MẢNG (không phân trang).
   * Dùng cho POS lookup / autocomplete. KHÔNG đổi shape trả về.
   */
  async search(params: CustomerSearchParams): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>(this.base, { params })
    return data
  }

  /**
   * Danh sách khách hàng có phân trang (cho bảng admin).
   * Luôn truyền page (mặc định 1) để backend trả PagedResult thay vì mảng phẳng.
   */
  async getListPaged(params?: CustomerListParams): Promise<PagedResult<Customer>> {
    const queryParams = { page: 1, pageSize: 20, ...params }
    const { data } = await api.get<RawPagedResult<Customer>>(this.base, { params: queryParams })
    return normalizePaged(data)
  }

  async getById(id: string): Promise<Customer> {
    const { data } = await api.get<Customer>(`${this.base}/${id}`)
    return data
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const { data } = await api.post<Customer>(this.base, dto)
    return data
  }
}

export const customerRepository = new CustomerRepository()
