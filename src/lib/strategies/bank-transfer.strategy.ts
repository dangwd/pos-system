/**
 * strategies/bank-transfer.strategy.ts
 *
 * Thanh toán chuyển khoản ngân hàng.
 * Backend nhận: { paymentMethod: "BankTransfer" }
 *
 * Luồng UI: Nhân viên xác nhận đã nhận chuyển khoản → click hoàn tất.
 * Không có callback/webhook — xác nhận thủ công.
 */

import type { PaymentStrategy } from './payment.strategy'
import type { PaymentMethod } from '@/types/transaction'

export class BankTransferStrategy implements PaymentStrategy {
  readonly paymentMethod: PaymentMethod = 'BANK'
  readonly label = 'ໂອນເງິນ'

  async prepare(_amount: number): Promise<void> {
    // Nhân viên xác nhận thủ công — không cần async action
  }
}
