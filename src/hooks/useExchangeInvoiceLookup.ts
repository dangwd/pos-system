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
import { useActivePriceConfig } from './useConfig'
import { useActiveTab } from './useActiveTab'
import type { CartItem } from '@/types/cart'
import type { Transaction } from '@/types/transaction'

export function useExchangeInvoiceLookup() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)

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

  const { priceConfig } = useActivePriceConfig()

  const { tab, setLinkedInvoice, clearLinkedInvoice, setCustomer } = useActiveTab()

  // limit mode → Transaction[]; paged mode → { data: Transaction[] }
  const results: Transaction[] = Array.isArray(searchResult)
    ? searchResult
    : ((searchResult as unknown as { data?: Transaction[] })?.data ?? [])

  const selectInvoice = async (transaction: Transaction) => {
    if (!priceConfig) return
    setIsSelecting(true)
    try {
    // Fetch full detail so item.productId (Product entity ID) is available —
    // the list endpoint does not include productId on items.
    const detail = await transactionRepository.getById(transaction.id)

    const exchangeItems: CartItem[] = detail.items.map(item => {
      // Khớp PriceItem theo weightUnitId → đúng gramPerUnit (Chỉ/Bath/Lượng)
      // ExchangeGold: vàng cũ tính theo giá BÁN RA hiện tại (per CLAUDE.md)
      const priceItem = priceConfig.items.find(p => p.weightUnitId === item.weightUnitId)
        ?? priceConfig.items[0]
      const perUnitGram = item.quantity > 0 ? item.weightGram / item.quantity : (priceItem?.gramPerUnit ?? 3.75)
      const gramPerUnit = priceItem?.gramPerUnit ?? perUnitGram
      // Ưu tiên giá BÁN RA hiện tại từ bảng giá; fallback về giá gốc hóa đơn khi bảng giá chưa cấu hình
      // Guard cả trường hợp priceItem tồn tại nhưng sellPrice = 0 (bảng giá chưa nhập giá)
      const unitPriceLakPerGram = (priceItem && priceItem.sellPrice > 0)
        ? priceItem.sellPrice / gramPerUnit
        : perUnitGram > 0 ? item.unitPriceLak / perUnitGram : 0

      return {
        // ExchangeIn: backend nhận Product entity ID từ phiếu gốc
        productId: item.productId ?? item.id,
        name: item.productSnapshotName,
        purity: '',
        weightGram: item.weightGram / item.quantity,
        productType: 'NguyenKhoi' as const,
        categoryName: 'Vàng cũ',
        weightUnitId: item.weightUnitId ?? null,
        weightUnitName: item.weightUnitName ?? null,
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

    setLinkedInvoice(detail.invoiceCode, exchangeItems)

    // Tự động điền khách hàng từ hóa đơn gốc
    if (detail.customer) {
      setCustomer(detail.customer.id, detail.customer.name, detail.customer.phoneNumber)
    }

    setQuery('')
    } finally {
      setIsSelecting(false)
    }
  }

  return {
    query,
    setQuery,
    results,
    isFetching: isFetching || isSelecting,
    linkedCode: tab?.linkedInvoiceCode ?? null,
    selectInvoice,
    clearLinkedInvoice,
  }
}
