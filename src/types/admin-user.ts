import type { UserRole } from './auth'

export interface UserRoleObject {
  id: string
  code: UserRole
  name: string
}

export interface AdminUser {
  id: string
  employeeCode: string
  username: string
  fullName: string
  phone: string
  email: string | null
  address: string | null
  dateOfBirth: string | null
  branchId: string
  counterId: string | null
  counterName: string | null
  role: UserRoleObject
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
  email?: string
  address?: string
  dateOfBirth?: string
}

export interface UpdateAdminUserDto {
  fullName: string
  phone: string
  branchId: string
  email?: string
  address?: string
  dateOfBirth?: string
}

export interface UpdateRoleDto {
  roleId: string
}

export interface ResetPasswordDto {
  newPassword: string
}

export interface CreateUserResponse {
  id: string
  employeeCode: string
  username: string
  fullName: string
}

export interface AssignCounterDto {
  counterId: string | null
}
