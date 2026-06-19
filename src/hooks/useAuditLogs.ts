import { useQuery } from '@tanstack/react-query'
import { AuthRepository } from '@/lib/repositories/auth.repository'
import type { AuditLogsParams } from '@/types/auth'

export function useAuditLogs(params?: AuditLogsParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => AuthRepository.getAuditLogs(params),
    staleTime: 30_000,
  })
}

export function useUserAuditLogs(params: AuditLogsParams & { userId: string }) {
  return useQuery({
    queryKey: ['audit-logs', 'user', params],
    queryFn: () => AuthRepository.getAuditLogs(params),
    staleTime: 30_000,
    enabled: !!params.userId,
  })
}
