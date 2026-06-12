/**
 * usePos — Hook Facade (Entry point duy nhất cho POS page)
 *
 * Tổng hợp tất cả hooks con. Component chỉ gọi usePos(),
 * không cần biết bên trong có Repository, Strategy hay Store nào.
 *
 * Cart state được đọc từ useActiveTab() → tự động cập nhật khi switch tab.
 *
 * Luồng thêm sản phẩm vào giỏ:
 *   1. Load priceConfig từ GET /api/config/prices (cache 1 phút)
 *   2. Khi nhân viên chọn sản phẩm từ InventoryItem (có inventoryItemId)
 *   3. Build CartItem với unitPrice snapshot từ priceConfig tại thời điểm đó
 *   4. addItemToActive(cartItem)
 */

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProducts } from './useProducts'
import { useActiveTab } from './useActiveTab'
import { useCheckout } from './useCheckout'
import { useCoupon } from './useCoupon'
import { useWeightUnits } from './useConfig'
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'
import { CashStrategy, BankTransferStrategy, CombinedStrategy } from '@/lib/strategies'
import { configRepository } from '@/lib/repositories/config.repository'

import type { Product } from '@/types/product'
import type { CartItem } from '@/types/cart'
import type { PaymentMethodKey } from '@/lib/strategies/payment.strategy'
import type { TransactionType } from '@/types/transaction'

// Khởi tạo strategies một lần ngoài hook (stateless objects)
const STRATEGIES = {
  'cash': new CashStrategy(),
  'bank-transfer': new BankTransferStrategy(),
  'combined': new CombinedStrategy(),
} as const

export function usePos() {
  // ── UI local state ──────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('cash')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')

  // ── Bảng giá hiện tại (cache 1 phút — giá cập nhật theo giờ) ────────────────
  const { data: priceConfig } = useQuery({
    queryKey: ['price-config', 'current'],
    queryFn: () => configRepository.getPrices(),
    staleTime: 60_000,
  })

  // ── Đơn vị trọng lượng (cache 10 phút — hiếm khi thay đổi) ─────────────────
  const { data: weightUnits = [] } = useWeightUnits()

  // ── Server state (sản phẩm từ API) ─────────────────────────────────────────
  const { data: products = [], isLoading: productsLoading } = useProducts()

  // ── Active tab state (cart, giảm giá, v.v.) ─────────────────────────────────
  const {
    tab,
    subtotal,
    total,
    totalQty,
    addItem,
    clearCart,
  } = useActiveTab()

  const { updateTab } = useInvoiceTabStore()
  const { applyAmount: applyDiscount, clear: clearDiscount } = useCoupon()

  // ── Checkout (Strategy Pattern) ─────────────────────────────────────────────
  const strategy = STRATEGIES[paymentMethod]
  const { mutateAsync: checkoutMutate, isPending: isCheckingOut, data: lastTransaction } =
    useCheckout(strategy)

  // ── Product filtering ───────────────────────────────────────────────────────
  const categories = ['all', ...Array.from(new Set(
    products.map(p => p.category.name)
  ))]

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = p.productName.toLowerCase().includes(q) ||
                        p.productCode.toLowerCase().includes(q)
    const matchCategory = category === 'all' || p.category.name === category
    return matchSearch && matchCategory
  })

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Thêm sản phẩm vào giỏ với unitPriceLakPerGram snapshot từ priceConfig.
   * Tìm giá theo purityCode + weightUnitId của sản phẩm.
   */
  const addToCart = (product: Product) => {
    if (!priceConfig) return // Chưa load giá — không thêm vào giỏ

    // Tìm PriceItem khớp purity code + weightUnit của sản phẩm
    const priceItem = priceConfig.items.find(
      item => item.purityCode === product.purity && item.weightUnitId === product.weightUnitId
    )
    // Nếu không tìm thấy exact match, thử theo purity code bất kỳ unit
    const fallback = priceConfig.items.find(item => item.purityCode === product.purity)
    const matched = priceItem ?? fallback

    // BuyGold dùng buyPrice (giá mua vào từ khách — thấp hơn)
    // Các nghiệp vụ còn lại dùng sellPrice (giá bán ra cho khách)
    const isBuyMode = (tab?.txnType ?? 'SellGold') === 'BuyGold'
    const unitPrice = matched ? (isBuyMode ? matched.buyPrice : matched.sellPrice) : 0
    // unitPriceLakPerGram = unitPrice / gramPerUnit — dùng cho lineTotal nội bộ
    const unitPriceLakPerGram = matched ? unitPrice / matched.gramPerUnit : 0

    // weightGram canonical = gramPerUnit từ bảng giá (source of truth cho pricing)
    // product.weightGram có thể = 0 nếu sản phẩm chưa cấu hình → dùng matched làm fallback
    const weightGram = matched?.gramPerUnit ?? product.weightGram

    // weightUnitId: ưu tiên unit từ matched price config (đảm bảo khớp với gramPerUnit)
    const weightUnitId = matched?.weightUnitId ?? product.weightUnitId

    const weightUnit = weightUnits.find(u => u.id === weightUnitId)
    const weightUnitName = weightUnit?.tenDonVi ?? matched?.weightUnitCode ?? null

    const cartItem: CartItem = {
      productId: product.id,
      name: product.productName,
      purity: product.purity,
      weightGram,
      productType: product.productType,
      categoryName: product.category.name,
      weightUnitId,
      weightUnitName,
      weightGramOverride: null,
      qty: 1,
      unitPriceLakPerGram,
      laborFee: 0,
      stoneFee: 0,
      itemRole: 'Normal',
      perItemDamage: 0,
      perItemWearChi: 0,
      isDamaged: false,
      isReadOnly: false,
    }
    addItem(cartItem)
  }

  const checkout = (params: {
    type: TransactionType
    customerId?: string
    note?: string
    cashAmount?: number
    bankAmount?: number
    referenceInvoiceCode?: string
  }) => checkoutMutate(params)

  const setTabPaying = () => {
    if (tab) updateTab(tab.id, { status: 'paying' })
  }

  const resetTabStatus = () => {
    if (tab) updateTab(tab.id, { status: 'draft' })
  }

  // ── Return API ──────────────────────────────────────────────────────────────
  return {
    // Products
    products: filteredProducts,
    productsLoading,
    categories,
    search, setSearch,
    category,
    setCategory: (v: string | null) => setCategory(v ?? 'all'),

    // Price config
    priceConfig,

    // Active tab cart
    cartItems: tab?.items ?? [],
    subtotal,
    total,
    totalQty,
    discount: tab?.discountAmount ?? 0,
    note: tab?.note ?? '',
    txnType: tab?.txnType ?? 'SellGold',

    // Cart actions
    addToCart,
    clearCart,

    // Discount (giảm giá thủ công — không có coupon API)
    applyDiscount,
    clearDiscount,

    // Payment
    paymentMethod, setPaymentMethod,
    checkout,
    isCheckingOut,
    lastTransaction,

    // Tab status (cho payment modal lifecycle)
    setTabPaying,
    resetTabStatus,
  }
}
