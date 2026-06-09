import api from '@/lib/axios'
import type { AdminUser, CreateAdminUserDto, UpdateRoleDto } from '@/types/admin-user'

export class UserRepository {
  async getList(branchId?: string): Promise<AdminUser[]> {
    const { data } = await api.get<AdminUser[]>('/api/users', {
      params: branchId ? { branchId } : undefined,
    })
    return data
  }

  async getById(id: string): Promise<AdminUser> {
    const { data } = await api.get<AdminUser>(`/api/users/${id}`)
    return data
  }

  async create(dto: CreateAdminUserDto): Promise<AdminUser> {
    const { data } = await api.post<AdminUser>('/api/users', dto)
    return data
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<AdminUser> {
    const { data } = await api.patch<AdminUser>(`/api/users/${id}/role`, dto)
    return data
  }

  async deactivate(id: string): Promise<AdminUser> {
    const { data } = await api.patch<AdminUser>(`/api/users/${id}/deactivate`)
    return data
  }
}

export const userRepository = new UserRepository()
