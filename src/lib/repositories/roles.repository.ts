import api from '@/lib/axios'
import type { UserRoleObject } from '@/types/admin-user'

export class RolesRepository {
  async getList(): Promise<UserRoleObject[]> {
    const { data } = await api.get<UserRoleObject[]>('/api/roles')
    return data
  }
}

export const rolesRepository = new RolesRepository()
