/**
 * useExchangeInvoiceLookup — Tìm kiếm HĐ bán vàng cũ và load ExchangeIn items
 *
 * Dùng trong màn hình ExchangeGold để:
 *  1. Tìm HĐ cũ theo mã (invoiceCode)
 *  2. Convert TransactionItem → CartItem với role ExchangeIn và giá buyPrice hiện tại
 *  3. Gọi setLinkedInvoice() để đưa items vào tab active
 */

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { configRepository } from '@/lib/repositories/config.repository'
import { useActiveTab } from './useActiveTab'
import type { CartItem } from '@/types/cart'
import type { Transaction } from '@/types/transaction'

export function useExchangeInvoiceLookup() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 400)
    return () => clearTimeout(timer)
  }, [query])

  const { data: searchResult, isFetching } = useQuery({
    queryKey: ['transactions', 'lookup', debouncedQuery],
    // limit mode → backend trả mảng phẳng Transaction[]
    queryFn: () => transactionRepository.getList({ invoiceCode: debouncedQuery, type: 'SellGold', limit: 10 }),
    enabled: debouncedQuery.length >= 3,
    staleTime: 30_000,
  })

  const { data: priceConfig } = useQuery({
    queryKey: ['price-config', 'current'],
    queryFn: () => configRepository.getPrices(),
    staleTime: 60_000,
  })

  const { tab, setLinkedInvoice, clearLinkedInvoice } = useActiveTab()

  // limit mode → Transaction[]; paged mode → { data: Transaction[] }
  const results: Transaction[] = Array.isArray(searchResult)
    ? searchResult
    : ((searchResult as unknown as { data?: Transaction[] })?.data ?? [])

  const selectInvoice = (transaction: Transaction) => {
    if (!priceConfig) return

    const exchangeItems: CartItem[] = transaction.items.map(item => {
      // Tìm PriceItem khớp — dùng buyPrice cho ExchangeIn
      const priceItem = priceConfig.items[0]
      const gramPerUnit = priceItem?.gramPerUnit ?? 3.75
      const unitPriceLakPerGram = priceItem ? priceItem.buyPrice / gramPerUnit : 0

      return {
        // Dùng TransactionItem.id làm productId proxy cho ExchangeIn items
        productId: item.id,
        name: item.productSnapshotName,
        purity: '',
        weightGram: item.weightGram / item.quantity,
        productType: 'NguyenKhoi' as const,
        categoryName: 'Vàng cũ',
        weightUnitId: item.weightUnitId ?? null,
        weightGramOverride: item.weightGram,
        qty: item.quantity,
        unitPriceLakPerGram,
        laborFee: 0,
        stoneFee: 0,
        itemRole: 'ExchangeIn' as const,
        perItemDamage: 0,
        perItemWearChi: 0,
        isDamaged: false,
        isReadOnly: true,
      }
    })

    setLinkedInvoice(transaction.invoiceCode, exchangeItems)
    setQuery('')
  }

  return {
    query,
    setQuery,
    results,
    isFetching,
    linkedCode: tab?.linkedInvoiceCode ?? null,
    selectInvoice,
    clearLinkedInvoice,
  }
}
