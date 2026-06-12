import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { message } from 'antd'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { extractErrorMessage } from '@/lib/errors'
import type { Transaction, TransactionItem, TransactionListParams, CancelTransactionDto } from '@/types/transaction'
import type { CartItem } from '@/types/cart'

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

function txItemToCartItem(item: TransactionItem): CartItem {
  const perUnitGram = item.quantity > 0 ? item.weightGram / item.quantity : item.weightGram
  return {
    productId: item.productId!,
    name: item.productSnapshotName,
    purity: '',
    weightGram: perUnitGram,
    productType: 'NguyenKhoi',
    categoryName: '',
    weightUnitId: item.weightUnitId ?? null,
    weightUnitName: item.weightUnitName ?? null,
    weightGramOverride: null,
    qty: item.quantity,
    unitPriceLakPerGram: perUnitGram > 0 ? item.unitPriceLak / perUnitGram : 0,
    laborFee: item.laborFee,
    stoneFee: item.stoneFee,
    itemRole: 'ExchangeIn',
    perItemDamage: 0,
    perItemWearChi: 0,
    isDamaged: false,
    isReadOnly: true,
  }
}

/** Tìm kiếm giao dịch theo mã hóa đơn — one-shot imperative search */
export function useTransactionLookup() {
  const [result, setResult] = useState<Transaction | null>(null)
  const [linkedItems, setLinkedItems] = useState<CartItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const search = async (invoiceCode: string) => {
    setIsSearching(true)
    setNotFound(false)
    setResult(null)
    setLinkedItems([])
    try {
      const list = await transactionRepository.getList({ invoiceCode, limit: 1 })
      const tx = list[0] ?? null
      setResult(tx)
      setLinkedItems(tx?.items.filter(i => !!i.productId).map(txItemToCartItem) ?? [])
      setNotFound(!tx)
    } catch {
      setNotFound(true)
    } finally {
      setIsSearching(false)
    }
  }

  const clear = useCallback(() => {
    setResult(null)
    setLinkedItems([])
    setIsSearching(false)
    setNotFound(false)
  }, [])

  return { result, linkedItems, isSearching, notFound, search, clear }
}

export function useTransactionById(id?: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionRepository.getById(id!),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useCancelTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: CancelTransactionDto }) =>
      transactionRepository.cancel(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    },
    onError: (err: unknown) => {
      message.error(extractErrorMessage(err, 'vi'))
    },
  })
}
