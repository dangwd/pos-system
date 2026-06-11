/**
 * useCheckout — Strategy consumer hook
 *
 * Kết hợp PaymentStrategy + TransactionRepository để hoàn thành giao dịch.
 * Luồng 2 bước theo API thực:
 *   1. create()   → POST /api/transactions         → trả về Transaction (Pending/Approved)
 *   2. complete() → POST /api/transactions/{id}/complete → Completed
 *
 * Sau khi thanh toán thành công:
 *  - clearActiveCart() xóa giỏ hàng của tab active
 *  - Tab giữ nguyên (không đóng) để phục vụ khách tiếp theo
 *  - ['transactions'] cache bị invalidate
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { useActiveTab } from './useActiveTab'
import type { PaymentStrategy } from '@/lib/strategies/payment.strategy'
import type { TransactionType } from '@/types/transaction'

interface CheckoutParams {
  type: TransactionType
  branchId: string
  staffId: string
  counterId: string
  customerId?: string
  note?: string
}

export function useCheckout(strategy: PaymentStrategy) {
  const qc = useQueryClient()
  const { tab, total, clearCart } = useActiveTab()

  return useMutation({
    mutationFn: async (params: CheckoutParams) => {
      if (!tab || tab.items.length === 0) {
        throw new Error('Giỏ hàng trống')
      }

      // Bước 1: chuẩn bị strategy (validate trước khi gọi API)
      await strategy.prepare(total)

      // Bước 2: tạo giao dịch
      const transaction = await transactionRepository.create({
        type: params.type,
        branchId: params.branchId,
        staffId: params.staffId,
        counterId: params.counterId,
        customerId: params.customerId,
        paymentMethod: strategy.paymentMethod,
        note: params.note,
        items: tab.items.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: item.qty,
          weightUnitId: item.weightUnitId ?? '',
          weightGramOverride: item.weightGramOverride,
          unitPriceLakPerGram: item.unitPriceLakPerGram,
          itemRole: 'Normal',
          laborFee: item.laborFee,
          stoneFee: item.stoneFee,
        })),
      })

      // Bước 3: hoàn tất nếu đã Approved
      if (transaction.status === 'Approved') {
        return transactionRepository.complete(transaction.id, {
          paymentMethod: strategy.paymentMethod,
        })
      }

      // status Pending → cần quản lý duyệt, trả về để UI hiển thị trạng thái chờ
      return transaction
    },

    onSuccess: (result) => {
      if (result.status === 'Completed' || result.status === 'Pending') {
        clearCart()
      }
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
