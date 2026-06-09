/**
 * repositories/customer.repository.ts
 *
 * Khớp với endpoints:
 *   GET  /api/customers           → tìm kiếm khách hàng
 *   GET  /api/customers/{id}      → chi tiết khách hàng
 *   POST /api/customers           → tạo khách hàng mới
 */

import api from '@/lib/axios'
import type { Customer, CreateCustomerDto, CustomerSearchParams } from '@/types/customer'

export class CustomerRepository {
  private readonly base = '/api/customers'

  async search(params: CustomerSearchParams): Promise<Customer[]> {
    const { data } = await api.get<Customer[]>(this.base, { params })
    return data
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
