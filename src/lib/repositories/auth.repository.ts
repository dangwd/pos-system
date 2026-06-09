import api from '@/lib/axios'
import type { LoginRequest, LoginResponse, RefreshResponse } from '@/types/auth'

export class AuthRepository {
  static async login(dto: LoginRequest): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/api/auth/login', dto)
    return data
  }

  static async refresh(refreshToken: string): Promise<RefreshResponse> {
    const { data } = await api.post<RefreshResponse>('/api/auth/refresh', { refreshToken })
    return data
  }

  static async logout(refreshToken: string): Promise<void> {
    await api.post('/api/auth/logout', { refreshToken })
  }
}
