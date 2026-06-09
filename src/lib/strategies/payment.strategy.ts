/**
 * strategies/payment.strategy.ts
 *
 * Strategy pattern cho thanh toán giao dịch POS.
 *
 * Luồng thanh toán thực tế (2 bước):
 *   1. Tạo giao dịch: TransactionRepository.create(dto) → status DRAFT/PENDING
 *   2. Hoàn tất:      TransactionRepository.complete(id, { paymentMethod }) → COMPLETED
 *
 * Mỗi strategy cung cấp:
 *   - paymentMethod: key gửi lên API backend (Cash | BankTransfer | QR)
 *   - label: text hiển thị trên UI
 *   - prepare(): logic cần chạy TRƯỚC khi complete (ví dụ: validate số tiền nhận)
 */

import type { PaymentMethod } from '@/types/transaction'

export interface PaymentStrategy {
  /** Phương thức thanh toán gửi lên API */
  readonly paymentMethod: PaymentMethod

  /** Text hiển thị trên UI (tiếng Lào) */
  readonly label: string

  /**
   * Logic chuẩn bị trước khi hoàn tất giao dịch.
   * Ném lỗi nếu không thể tiến hành thanh toán.
   * @param amount Tổng tiền phải thu (₭)
   */
  prepare(amount: number): Promise<void>
}

export type PaymentMethodKey = 'cash' | 'bank-transfer' | 'qr'

// Danh sách tất cả payment keys — labels được lấy từ messages (pos.payment.methods.*)
export const PAYMENT_METHOD_KEYS: PaymentMethodKey[] = ['cash', 'bank-transfer', 'qr']

export const PAYMENT_METHOD_MAP: Record<PaymentMethodKey, PaymentMethod> = {
  'cash': 'Cash',
  'bank-transfer': 'BankTransfer',
  'qr': 'QR',
}
