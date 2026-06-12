import { useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { message } from 'antd'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import type { TransactionListParams } from '@/types/transaction'

const TRANSACTIONS_KEY = ['transactions'] as const

export function useTransactions(params?: TransactionListParams) {
  const query = useQuery({
    queryKey: [...TRANSACTIONS_KEY, params],
    queryFn: () => transactionRepository.getList(params),
    staleTime: 30_000,
    refetchInterval: 30_000,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (query.error) {
      message.error((query.error as Error).message || 'Lỗi tải dữ liệu giao dịch')
    }
  }, [query.error])

  return query
}
