/**
 * useAddToCart — Xây CartItem từ ProductWithStock + priceConfig snapshot.
 *
 * Tái dùng bởi usePos (F3 search) và TransactionTable (ExchangeIn search).
 * Role 'ExchangeIn' → panel A vàng cũ; 'Normal' → panel B hàng mới.
 */

import { useActiveTab } from './useActiveTab'
import { useWeightUnits } from './useConfig'
import type { ProductWithStock } from '@/types/product'
import type { PriceConfig } from '@/types/config'

export function useAddToCart(priceConfig: PriceConfig | undefined) {
  const { addItem, tab } = useActiveTab()
  const { data: weightUnits = [] } = useWeightUnits()

  const addToCartAs = (
    product: ProductWithStock,
    role: 'Normal' | 'ExchangeIn' = 'Normal',
  ) => {
    if (!priceConfig) return
    if (tab?.cancelTransactionId) return

    const priceItem = priceConfig.items.find(
      p => p.purityCode === product.purity && p.weightUnitId === product.weightUnitId,
    )
    const fallback = priceConfig.items.find(p => p.purityCode === product.purity)
    const matched = priceItem ?? fallback

    // Vàng cũ đổi vào (ExchangeIn) → luôn định giá theo giá MUA VÀO (cửa hàng thu mua).
    // BuyGold/BuySilver → buyPrice; còn lại (hàng mới bán ra) → sellPrice.
    const txnType = tab?.txnType ?? 'SellGold'
    const isBuyMode = role === 'ExchangeIn' || txnType === 'BuyGold' || txnType === 'BuySilver'
    const unitPrice = matched ? (isBuyMode ? matched.buyPrice : matched.sellPrice) : 0
    const unitPriceLakPerGram = matched ? unitPrice / matched.gramPerUnit : 0

    // Ưu tiên đơn vị từ sản phẩm (product.weightUnitId), fallback về priceConfig
    const weightUnitId = product.weightUnitId ?? matched?.weightUnitId ?? null

    // gramPerUnit: dùng priceItem exact-match → đơn vị của sản phẩm → product.weightGram
    const productWeightUnit = weightUnits.find(u => u.id === (product.weightUnitId ?? undefined))
    const weightGram = priceItem?.gramPerUnit ?? productWeightUnit?.gramPerUnit ?? product.weightGram

    const weightUnit = weightUnits.find(u => u.id === (weightUnitId ?? undefined))
    const weightUnitName = weightUnit?.tenDonVi ?? matched?.weightUnitCode ?? null

    addItem({
      productId: product.id,
      name: product.productName,
      purity: product.purity ?? '',
      weightGram,
      productType: product.productType,
      categoryName: product.categoryName,
      weightUnitId,
      weightUnitName,
      weightGramOverride: null,
      qty: 1,
      unitPriceLakPerGram,
      laborFee: 0,
      stoneFee: 0,
      itemRole: role,
      perItemDamage: 0,
      perItemWearChi: 0,
      wearUnitGram: txnType === 'BuySilver' ? 1 : 3.75,
      isDamaged: false,
      isReadOnly: false,
    })
  }

  return { addToCartAs }
}
