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
  branchId: string
}

export interface AuthUser {
  userId: string
  fullName: string
  role: UserRole
  permissions: string[]
  branchId: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}
