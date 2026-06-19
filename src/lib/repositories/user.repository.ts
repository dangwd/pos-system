import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import { normalizePaged, type PagedResult, type RawPagedResult } from '@/types/common'
import type {
  AdminUser,
  AssignCounterDto,
  CreateAdminUserDto,
  CreateUserResponse,
  UpdateAdminUserDto,
  UpdateRoleDto,
  ResetPasswordDto,
} from '@/types/admin-user'

export interface UserListParams {
  branchId?: string
  counterId?: string
  roleId?: string
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export class UserRepository {
  async getList(params?: UserListParams): Promise<AdminUser[]> {
    try {
      const { data } = await api.get<AdminUser[] | RawPagedResult<AdminUser>>('/api/users', { params })
      if (Array.isArray(data)) return data
      return normalizePaged(data).data
    } catch (err) {
      throw handleAxiosError(err)
    }
  }

  /**
   * Phân trang server-side. Truyền page+pageSize → backend trả PagedResult.
   * Giữ nguyên `getList` (mảng) cho dropdown/lookup.
   */
  async getListPaged(params?: UserListParams): Promise<PagedResult<AdminUser>> {
    try {
      const { data } = await api.get<RawPagedResult<AdminUser>>('/api/users', { params })
      return normalizePaged(data)
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

  async forceLogout(id: string): Promise<void> {
    try {
      await api.post(`/api/users/${id}/force-logout`)
    } catch (err) {
      throw handleAxiosError(err)
    }
  }
}

export const userRepository = new UserRepository()
