/**
 * lib/axios.ts — Axios instance duy nhất cho toàn project
 *
 * - baseURL: NEXT_PUBLIC_API_BASE_URL (ASP.NET Core backend)
 * - Request interceptor: tự động đính JWT vào Authorization header
 * - Response interceptor: tự động refresh token khi nhận 401
 *   → Sau khi refresh thành công: retry request gốc
 *   → Nếu refresh thất bại: xóa tokens và redirect /login
 *
 * Sử dụng: import api from '@/lib/axios' (KHÔNG import axios trực tiếp)
 */

import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor: đính JWT ───────────────────────────────────────────

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// ─── Response interceptor: auto-refresh khi 401 ───────────────────────────────

api.interceptors.response.use(
  response => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean }

    // Chỉ retry một lần để tránh vòng lặp vô tận
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('No refresh token')

        // Gọi trực tiếp axios (không qua instance) để tránh interceptor loop
        const { data } = await axios.post(
          `${api.defaults.baseURL}/api/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        )

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        // Retry request gốc với token mới
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        // Refresh thất bại → xóa session và chuyển đến trang đăng nhập
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api
