import { useQuery } from '@tanstack/react-query'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import type { TransactionListParams } from '@/types/transaction'

const TRANSACTIONS_KEY = ['transactions'] as const

export function useTransactions(params?: TransactionListParams) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, params],
    queryFn: () => transactionRepository.getList(params),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}
