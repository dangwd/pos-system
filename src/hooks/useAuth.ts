import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { toast } from 'sonner'
import { AuthRepository } from '@/lib/repositories/auth.repository'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorMessage } from '@/lib/errors'
import type { AppLocale } from '@/lib/errors'
import type { ApiError } from '@/lib/api-error'
import type { LoginRequest } from '@/types/auth'

export function useLogin() {
  const router = useRouter()
  const locale = useLocale() as AppLocale
  const setAuth = useAuthStore(s => s.setAuth)

  return useMutation<Awaited<ReturnType<typeof AuthRepository.login>>, ApiError, LoginRequest>({
    mutationFn: (dto) => AuthRepository.login(dto),
    onSuccess: async (data) => {
      // Lưu token trước để getMe có thể dùng Authorization header
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      // Gọi /me để lấy branchName, counterName, employeeCode đầy đủ
      const me = await AuthRepository.getMe()
      setAuth(
        {
          userId: me.id,
          employeeCode: me.employeeCode,
          fullName: me.fullName,
          phone: me.phone,
          role: me.role,
          permissions: me.permissions,
          branchId: me.branchId,
          branchName: me.branchName,
          counterId: me.counterId,
          counterName: me.counterName,
          lastLoginAt: me.lastLoginAt,
        },
        data.accessToken,
        data.refreshToken,
      )
      router.replace(me.role === 'Cashier' ? '/pos' : '/admin/dashboard')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err.code, locale))
    },
  })
}

export function useLogout() {
  const router = useRouter()
  const clearAuth = useAuthStore(s => s.clearAuth)

  return useMutation<void, ApiError>({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await AuthRepository.logout(refreshToken)
      }
    },
    onSuccess: () => {
      clearAuth()
      router.replace('/login')
    },
    onError: () => {
      // Logout is best-effort — always clear local session regardless
      clearAuth()
      router.replace('/login')
    },
  })
}

export function useCurrentUser() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: AuthRepository.getMe,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  })
}
