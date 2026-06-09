/**
 * strategies/cash.strategy.ts
 *
 * Thanh toán tiền mặt — phương thức phổ biến nhất tại quầy.
 * Backend nhận: { paymentMethod: "Cash" }
 */

import type { PaymentStrategy } from './payment.strategy'
import type { PaymentMethod } from '@/types/transaction'

export class CashStrategy implements PaymentStrategy {
  readonly paymentMethod: PaymentMethod = 'Cash'
  readonly label = 'ເງິນສົດ'

  /**
   * Tiền mặt không cần bước verify ngoại tuyến.
   * Thu ngân đếm tiền xác nhận → click "Hoàn tất" là đủ.
   */
  async prepare(_amount: number): Promise<void> {
    // Không có action async — backend validate
  }
}
