import type { UserRole } from './auth'

export interface AdminUser {
  id: string
  employeeCode: string
  username: string
  fullName: string
  phone: string
  branchId: string
  role: UserRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface CreateAdminUserDto {
  employeeCode: string
  fullName: string
  phone: string
  password: string
  branchId: string
  roleId: string
}

export interface UpdateRoleDto {
  roleId: string
}
