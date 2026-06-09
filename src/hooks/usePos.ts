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
import { useInvoiceTabStore } from '@/stores/invoice-tab.store'
import { CashStrategy, BankTransferStrategy, QRStrategy } from '@/lib/strategies'
import { configRepository } from '@/lib/repositories/config.repository'
import { calcGoldLineSell } from '@/lib/pricing'
import type { Product } from '@/types/product'
import type { CartItem } from '@/types/cart'
import type { PaymentMethodKey } from '@/lib/strategies/payment.strategy'
import type { TransactionType } from '@/types/transaction'

// Khởi tạo strategies một lần ngoài hook (stateless objects)
const STRATEGIES = {
  'cash': new CashStrategy(),
  'bank-transfer': new BankTransferStrategy(),
  'qr': new QRStrategy(),
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
   * Thêm sản phẩm vào giỏ với unitPrice snapshot từ priceConfig.
   *
   * TODO: Khi UI tích hợp inventory search, truyền thêm inventoryItemId thực từ InventoryItem.
   * Hiện tại dùng product.id làm placeholder inventoryItemId.
   */
  const addToCart = (product: Product) => {
    if (!priceConfig) return // Chưa load giá — không thêm vào giỏ

    // Snapshot unitPrice theo loại sản phẩm: vàng → giá/chỉ, bạc → giá/gram
    const isSilver = product.category.code.startsWith('BAC')
    const unitPrice = isSilver
      ? priceConfig.silverPricePerGram
      : calcGoldLineSell(product.weightPerUnitMg, priceConfig.goldSellPricePerChi)

    const cartItem: CartItem = {
      inventoryItemId: product.id, // placeholder — đổi thành ID thực từ inventory khi tích hợp
      productId: product.id,
      name: product.productName,
      purity: product.purity,
      weightPerUnitMg: product.weightPerUnitMg,
      categoryName: product.category.name,
      qty: 1,
      unitPrice,
      laborFee: 0,
      stoneFee: 0,
    }
    addItem(cartItem)
  }

  /**
   * Thực hiện thanh toán.
   * branchId và counterId phải được lấy từ session user hiện tại.
   */
  const checkout = (params: {
    transactionType: TransactionType
    branchId: string
    counterId: string
    customerId?: string
    note?: string
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
    allProducts: products,
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
