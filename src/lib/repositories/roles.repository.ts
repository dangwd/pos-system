import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type { UserRoleObject } from '@/types/admin-user'

export class RolesRepository {
  async getList(): Promise<UserRoleObject[]> {
    try {
      const { data } = await api.get<UserRoleObject[]>('/api/config/roles')
      return data
    } catch (err) { throw handleAxiosError(err) }
  }
}

export const rolesRepository = new RolesRepository()
