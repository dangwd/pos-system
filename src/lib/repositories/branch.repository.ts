import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type {
  Branch,
  Counter,
  CreateBranchDto,
  UpdateBranchDto,
  CreateCounterDto,
  UpdateCounterDto,
} from '@/types/branch'

export class BranchRepository {
  async getList(): Promise<Branch[]> {
    try {
      const { data } = await api.get<Branch[]>('/api/branches')
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async getById(id: string): Promise<Branch> {
    try {
      const { data } = await api.get<Branch>(`/api/branches/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async create(dto: CreateBranchDto): Promise<{ id: string; name: string }> {
    try {
      const { data } = await api.post<{ id: string; name: string }>('/api/branches', dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    try {
      const { data } = await api.put<Branch>(`/api/branches/${id}`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async getCounters(branchId: string): Promise<Counter[]> {
    try {
      const { data } = await api.get<Counter[]>(`/api/branches/${branchId}/counters`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async createCounter(branchId: string, dto: CreateCounterDto): Promise<Counter> {
    try {
      const { data } = await api.post<Counter>(`/api/branches/${branchId}/counters`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async updateCounter(branchId: string, counterId: string, dto: UpdateCounterDto): Promise<Counter> {
    try {
      const { data } = await api.put<Counter>(`/api/branches/${branchId}/counters/${counterId}`, dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async deactivateCounter(branchId: string, counterId: string): Promise<void> {
    try {
      await api.patch(`/api/branches/${branchId}/counters/${counterId}/deactivate`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const branchRepository = new BranchRepository()
