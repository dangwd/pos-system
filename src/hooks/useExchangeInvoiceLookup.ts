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
import { productRepository } from '@/lib/repositories/product.repository'
import { getBuyBackStatus, resolveExchangeInPricePerGram } from '@/lib/buy-back'
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
    // status: 'Completed' → loại HĐ đã hủy (Cancelled) ngay từ nguồn — không cho thu đổi
    queryFn: () => transactionRepository.getList({ invoiceCode: debouncedQuery, type: 'SellGold', status: 'Completed', limit: 10 }),
    enabled: debouncedQuery.length >= 3,
    staleTime: 30_000,
  })

  const { priceConfig, priceTableId } = useActivePriceConfig()

  const { tab, setLinkedInvoice, clearLinkedInvoice, setCustomer, clearCustomer } = useActiveTab()

  // Bỏ liên kết HĐ gốc → clear luôn khách đã auto-điền từ HĐ đó (bug: khách còn sót).
  const clearLinked = () => {
    clearLinkedInvoice()
    clearCustomer()
  }

  // limit mode → Transaction[]; paged mode → { data: Transaction[] }
  // Lọc thêm ở client phòng backend bỏ qua filter status khi tìm theo invoiceCode chính xác.
  const results: Transaction[] = (Array.isArray(searchResult)
    ? searchResult
    : ((searchResult as unknown as { data?: Transaction[] })?.data ?? [])
  ).filter((t) => t.status !== 'Cancelled')

  const selectInvoice = async (transaction: Transaction) => {
    if (!priceConfig) return
    // Guard cuối: không thu đổi HĐ đã hủy (kể cả khi lọt qua lọc trên)
    if (transaction.status === 'Cancelled') return
    setIsSelecting(true)
    try {
    // Fetch full detail: item.productId + 3 field buyback (phẳng trên transaction,
    // theo docs "Kiểm tra HĐ còn hạn" §2.1 — KHÔNG cần gọi GET /api/config/system).
    const detail = await transactionRepository.getById(transaction.id)

    // Item HĐ KHÔNG có tuổi vàng (purity) → fetch product theo productId để khớp
    // đúng dòng bảng giá. Song song, lỗi/không tìm thấy → '' (fallback khớp theo đơn vị).
    const purities = await Promise.all(
      detail.items.map(it =>
        it.productId
          ? productRepository.getById(it.productId).then(p => p.purity ?? '').catch(() => '')
          : Promise.resolve(''),
      ),
    )

    // Trạng thái buyback tính 1 lần cho cả phiếu (mọi item cùng transactedAt).
    const maxDays = detail.buyBackOriginalPriceMaxDays ?? 0
    // Chữ ký cấu hình lúc tính — để useSyncBuybackPrices biết khi nào cần recompute.
    const buyBackSig = `${detail.buyBackOriginalPriceEnabled ?? false}|${maxDays}|${priceTableId ?? ''}`
    const status = getBuyBackStatus({
      daysSincePurchase: detail.daysSincePurchase ?? 0,
      buyBackOriginalPriceEnabled: detail.buyBackOriginalPriceEnabled ?? false,
      buyBackOriginalPriceMaxDays: maxDays,
    })
    // Tắt tính năng → không gắn buyBack (không hiện badge).
    const buyBack = status.reason === 'feature_disabled'
      ? undefined
      : {
          withinWindow: status.canApplyOriginalPrice,
          reason: status.reason,
          daysRemaining: status.daysRemaining,
          maxDays,
        }

    const exchangeItems: CartItem[] = detail.items.map((item, idx) => {
      const purity = purities[idx]
      const perUnitGram = item.quantity > 0 ? item.weightGram / item.quantity : 3.75
      // Giá vàng cũ thu vào — helper chung (khớp tuổi vàng + buyPrice + còn/hết hạn).
      // Dùng lại y hệt khi recompute lúc đổi cấu hình (useSyncBuybackPrices).
      const unitPriceLakPerGram = resolveExchangeInPricePerGram({
        priceItems: priceConfig.items,
        purity,
        weightUnitId: item.weightUnitId ?? null,
        originalUnitPriceLak: item.unitPriceLak,
        perUnitGram,
        enabled: detail.buyBackOriginalPriceEnabled ?? false,
        maxDays,
        daysSincePurchase: detail.daysSincePurchase ?? 0,
      })

      return {
        // ExchangeIn: backend nhận Product entity ID từ phiếu gốc
        productId: item.productId ?? item.id,
        name: item.productSnapshotName,
        purity,
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
        wearUnitGram: 3.75,
        isDamaged: false,
        isReadOnly: true,
        // Lưu input thô + chữ ký để recompute giá khi đổi cấu hình/bảng giá (tab persist localStorage).
        originalUnitPriceLak: item.unitPriceLak,
        daysSincePurchase: detail.daysSincePurchase ?? 0,
        buyBackSig,
        ...(buyBack ? { buyBack } : {}),
      }
    })

    setLinkedInvoice(detail.invoiceCode, exchangeItems, detail.transactedAt)

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
    clearLinkedInvoice: clearLinked,
  }
}
