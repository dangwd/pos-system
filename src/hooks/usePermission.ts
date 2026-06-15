import { useAuthStore } from '@/stores/auth.store'

export function usePermission() {
  const { user } = useAuthStore()

  function hasPermission(permission: string): boolean {
    if (!user) return false
    return user.permissions.includes(permission)
  }

  function hasAnyPermission(...permissions: string[]): boolean {
    if (!user) return false
    return permissions.some(p => user.permissions.includes(p))
  }

  return { hasPermission, hasAnyPermission }
}
