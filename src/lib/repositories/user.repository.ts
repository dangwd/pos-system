import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type {
  AdminUser,
  AssignCounterDto,
  CreateAdminUserDto,
  CreateUserResponse,
  UpdateAdminUserDto,
  UpdateRoleDto,
  ResetPasswordDto,
} from '@/types/admin-user'

export class UserRepository {
  async getList(branchId?: string): Promise<AdminUser[]> {
    try {
      const { data } = await api.get<AdminUser[]>('/api/users', {
        params: branchId ? { branchId } : undefined,
      })
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async getById(id: string): Promise<AdminUser> {
    try {
      const { data } = await api.get<AdminUser>(`/api/users/${id}`)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async create(dto: CreateAdminUserDto): Promise<CreateUserResponse> {
    try {
      const { data } = await api.post<CreateUserResponse>('/api/users', dto)
      return data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async update(id: string, dto: UpdateAdminUserDto): Promise<void> {
    try {
      await api.put(`/api/users/${id}`, dto)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<void> {
    try {
      await api.patch(`/api/users/${id}/role`, dto)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async activate(id: string): Promise<void> {
    try {
      await api.patch(`/api/users/${id}/activate`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async deactivate(id: string): Promise<void> {
    try {
      await api.patch(`/api/users/${id}/deactivate`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async assignCounter(id: string, dto: AssignCounterDto): Promise<void> {
    try {
      await api.patch(`/api/users/${id}/counter`, dto)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    try {
      await api.post(`/api/users/${id}/reset-password`, dto)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const userRepository = new UserRepository()
