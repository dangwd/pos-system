/**
 * useCheckout — Strategy consumer hook
 *
 * Kết hợp PaymentStrategy + TransactionRepository để hoàn thành giao dịch.
 * Luồng theo API thực:
 *   1. create() → POST /api/transactions → trả về GUID string
 *   2. getById() → GET /api/transactions/{id} → Transaction với status thực tế
 *   3. Nếu status === 'Approved' → complete() → COMPLETED
 *
 * Sau khi thanh toán thành công:
 *  - clearActiveCart() xóa giỏ hàng của tab active
 *  - ['transactions'] cache bị invalidate
 *  - Toast thành công / chờ duyệt được hiển thị từ đây (không phải từ page)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { transactionRepository } from '@/lib/repositories/transaction.repository'
import { getErrorMessage } from '@/lib/errors'
import { useActiveTab } from './useActiveTab'
import type { ApiError } from '@/lib/api-error'
import type { AppLocale } from '@/lib/errors'
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
  const locale = useLocale() as AppLocale
  const t = useTranslations('pos.errors')
  const { tab, total, clearCart } = useActiveTab()

  return useMutation({
    mutationFn: async (params: CheckoutParams) => {
      if (!tab || tab.items.length === 0) {
        throw new Error('Giỏ hàng trống')
      }

      await strategy.prepare(total)

      // create() trả về GUID string
      const transactionId = await transactionRepository.create({
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

      // Lấy Transaction đầy đủ để UI biết status và hiển thị receipt
      const transaction = await transactionRepository.getById(transactionId)

      // Nếu transaction đã được duyệt (auto-approve hoặc cashier có quyền), hoàn tất ngay
      if (transaction.status === 'Approved') {
        return transactionRepository.complete(transaction.id, { paymentMethod: strategy.paymentMethod })
      }

      return transaction
    },

    onSuccess: (result) => {
      // Xóa giỏ hàng và làm mới danh sách giao dịch
      clearCart()
      qc.invalidateQueries({ queryKey: ['transactions'] })

      // Hiển thị thông báo dựa trên trạng thái giao dịch
      if (result.status === 'Completed') {
        toast.success(t('checkoutSuccess'))
      } else {
        // Pending, Approved hoặc trạng thái khác → chờ duyệt
        toast.info(t('pendingApproval'))
      }
    },

    onError: (err: unknown) => {
      const apiErr = err as ApiError
      if (apiErr?.code) {
        toast.error(getErrorMessage(apiErr.code, locale))
      } else {
        toast.error(t('checkoutFailed'))
      }
    },
  })
}
