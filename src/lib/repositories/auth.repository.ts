import api from '@/lib/axios'
import { handleAxiosError } from '@/lib/api-error'
import type { LoginRequest, LoginResponse, RefreshResponse, MeResponse, AuditLogsParams, AuditLogsPaginatedResponse } from '@/types/auth'

export class AuthRepository {
  static async login(dto: LoginRequest): Promise<LoginResponse> {
    try {
      const { data } = await api.post<LoginResponse>('/api/auth/login', dto)
      return data
    } catch (err) {
      handleAxiosError(err)
    }
  }

  static async refresh(refreshToken: string): Promise<RefreshResponse> {
    try {
      const { data } = await api.post<RefreshResponse>('/api/auth/refresh', { refreshToken })
      return data
    } catch (err) {
      handleAxiosError(err)
    }
  }

  static async logout(refreshToken: string): Promise<void> {
    try {
      await api.post('/api/auth/logout', { refreshToken })
    } catch (err) {
      handleAxiosError(err)
    }
  }

  static async getMe(): Promise<MeResponse> {
    try {
      const { data } = await api.get<MeResponse>('/api/auth/me')
      return data
    } catch (err) {
      handleAxiosError(err)
    }
  }

  static async getAuditLogs(params?: AuditLogsParams): Promise<AuditLogsPaginatedResponse> {
    try {
      const { data } = await api.get<AuditLogsPaginatedResponse>('/api/auth/audit-logs', { params })
      return data
    } catch (err) {
      handleAxiosError(err)
    }
  }
}
