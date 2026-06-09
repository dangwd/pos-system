/**
 * useCheckout — Strategy consumer hook
 *
 * Kết hợp PaymentStrategy + TransactionRepository để hoàn thành giao dịch.
 * Luồng 2 bước theo API thực:
 *   1. create()   → POST /api/transactions         → trả về Transaction (DRAFT/PENDING)
 *   2. complete() → POST /api/transactions/{id}/complete → COMPLETED
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
  transactionType: TransactionType
  branchId: string
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

      // Bước 2: tạo giao dịch DRAFT/PENDING
      const transaction = await transactionRepository.create({
        transactionType: params.transactionType,
        branchId: params.branchId,
        counterId: params.counterId,
        customerId: params.customerId,
        note: params.note,
        items: tab.items.map(item => ({
          inventoryItemId: item.inventoryItemId,
          productId: item.productId,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          laborFee: item.laborFee,
          stoneFee: item.stoneFee,
        })),
      })

      // Bước 3: hoàn tất giao dịch với paymentMethod
      // Chỉ gọi complete() khi status APPROVED (có thể cần duyệt trước)
      // Nếu backend đặt DRAFT thẳng vào APPROVED do không vượt hạn mức → complete ngay
      if (transaction.status === 'APPROVED' || transaction.status === 'DRAFT') {
        return transactionRepository.complete(transaction.id, {
          paymentMethod: strategy.paymentMethod,
        })
      }

      // status PENDING → cần quản lý duyệt, trả về để UI hiển thị trạng thái chờ
      return transaction
    },

    onSuccess: (result) => {
      // Xóa giỏ hàng sau khi GD COMPLETED hoặc PENDING (đã ghi nhận phía server)
      if (result.status === 'COMPLETED' || result.status === 'PENDING') {
        clearCart()
      }
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
