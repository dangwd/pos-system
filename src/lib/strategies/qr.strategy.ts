/**
 * strategies/qr.strategy.ts
 *
 * Thanh toán QR Code (BCEL One, JDB Bank...).
 * Backend nhận: { paymentMethod: "QR" }
 *
 * Luồng UI: Hiển thị mã QR → khách quét → nhân viên xác nhận nhận tiền → hoàn tất.
 * Hiện tại xác nhận thủ công (chưa có webhook từ ngân hàng).
 * TODO: Tích hợp webhook từ ngân hàng khi có thêm tài liệu API ngân hàng.
 */

import type { PaymentStrategy } from './payment.strategy'
import type { PaymentMethod } from '@/types/transaction'

export class QRStrategy implements PaymentStrategy {
  readonly paymentMethod: PaymentMethod = 'BANK'
  readonly label = 'QR Code'

  async prepare(_amount: number): Promise<void> {
    // QR generation xử lý ở component PaymentModal
    // Strategy chỉ cần provide paymentMethod cho API
  }
}
