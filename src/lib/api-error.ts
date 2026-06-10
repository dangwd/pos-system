import axios from 'axios'

export class ApiError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'ApiError'
  }
}

export function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    throw new ApiError(err.response?.data?.errorCode ?? 'SYSTEM_INTERNAL_ERROR')
  }
  throw err
}
