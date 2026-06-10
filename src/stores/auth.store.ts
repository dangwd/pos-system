import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

const AUTH_COOKIE = 'is_authenticated'
const ROLE_COOKIE = 'user_role'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 hours — matches JWT session

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
        document.cookie = `${ROLE_COOKIE}=${user.role}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
        set({ user, isAuthenticated: true })
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
        document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-store',
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated }),
    }
  )
)
