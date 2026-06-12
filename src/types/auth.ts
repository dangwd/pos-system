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
  fullName: string
  role: UserRole
  permissions: string[]
  branchId: string | null
  counterId: string | null
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
  counterId: string | null
  lastLoginAt: string | null
}
