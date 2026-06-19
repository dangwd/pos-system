export type UserRole = 'Cashier' | 'ThuQuy' | 'Manager' | 'SystemAdmin'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  userId: string
  fullName: string
  role: UserRole
  permissions: string[]
  branchId: string | null
  counterId: string | null
}

export interface AuthUser {
  userId: string
  employeeCode: string
  fullName: string
  phone: string | null
  role: UserRole
  permissions: string[]
  branchId: string | null
  branchName: string | null
  counterId: string | null
  counterName: string | null
  lastLoginAt: string | null
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface MeResponse {
  id: string
  employeeCode: string
  fullName: string
  phone: string | null
  role: UserRole
  permissions: string[]
  branchId: string | null
  branchName: string | null
  counterId: string | null
  counterName: string | null
  lastLoginAt: string | null
}

export type LoginEventType =
  | 'LoginSuccess'
  | 'LoginFailedBadCredentials'
  | 'LoginFailedInactive'
  | 'Logout'
  | 'TokenRefreshed'

export const LOGIN_EVENT_TYPE_INT: Record<LoginEventType, number> = {
  LoginSuccess: 1,
  LoginFailedBadCredentials: 2,
  LoginFailedInactive: 3,
  Logout: 4,
  TokenRefreshed: 5,
}

export interface LoginAuditLog {
  id: string
  userId: string | null
  attemptedUsername: string
  eventType: LoginEventType
  ipAddress: string | null
  userAgent: string | null
  occurredAt: string
}

export interface AuditLogsParams {
  userId?: string
  username?: string
  eventType?: number
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export interface AuditLogsPaginatedResponse {
  items: LoginAuditLog[]
  total: number
  page: number
  pageSize: number
}
