/**
 * repositories/customer.repository.ts
 *
 * Khớp với endpoints:
 *   GET  /api/customers           → tìm kiếm khách hàng
 *   GET  /api/customers/{id}      → chi tiết khách hàng
 *   POST /api/customers           → tạo khách hàng mới
 *   PUT  /api/customers/{id}      → cập nhật khách hàng
 */

import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerSearchParams } from '@/types/customer'

export class CustomerRepository {
  private readonly base = '/api/customers'

  async search(params: CustomerSearchParams): Promise<Customer[]> {
    try {
      const { data } = await api.get<Customer[]>(this.base, { params })
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async getById(id: string): Promise<Customer> {
    try {
      const { data } = await api.get<Customer>(`${this.base}/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async create(dto: CreateCustomerDto): Promise<Customer> {
    try {
      const { data } = await api.post<Customer>(this.base, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    try {
      const { data } = await api.put<Customer>(`${this.base}/${id}`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const customerRepository = new CustomerRepository()
