import type { PaymentStrategy } from './payment.strategy'
import type { PaymentMethod } from '@/types/transaction'

export class CombinedStrategy implements PaymentStrategy {
  readonly paymentMethod: PaymentMethod = 'COMBINED'
  readonly label = 'ເງິນສົດ + ໂອນເງິນ'

  async prepare(_amount: number): Promise<void> {
    // cashAmount + bankAmount validated in PaymentModal before calling checkout
  }
}
