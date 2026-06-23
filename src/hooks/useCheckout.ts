/**
 * useCheckout — Strategy consumer hook
 *
 * Luồng mới (API đã đơn giản hoá):
 *   POST /api/transactions → Completed ngay lập tức (trả GUID)
 *
 * Sau khi thành công:
 *  - clearActiveCart() xóa giỏ hàng của tab active
 *  - ['transactions'] cache bị invalidate
 */

import { ApiError } from "@/lib/api-error";
import type { AppLocale } from "@/lib/errors";
import { getErrorMessage } from "@/lib/errors";
import { transactionRepository } from "@/lib/repositories/transaction.repository";
import type { PaymentStrategy } from "@/lib/strategies/payment.strategy";
import type { PaymentMethod, TransactionType } from "@/types/transaction";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useToast } from "@/lib/toast";
import { useActiveTab } from "./useActiveTab";

interface CheckoutParams {
  type: TransactionType;
  customerId: string; // bắt buộc — backend trả CUSTOMER_REQUIRED nếu thiếu
  priceTableId?: string | null; // bảng giá đang áp dụng — bắt buộc trừ ExchangeCurrency
  note?: string;
  paymentMethod?: PaymentMethod;
  cashAmount?: number; // Bắt buộc khi COMBINED
  bankAmount?: number; // Bắt buộc khi COMBINED
  referenceInvoiceCode?: string;
}

export function useCheckout(strategy: PaymentStrategy) {
  const qc = useQueryClient();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("pos.errors");
  const toast = useToast();
  const { tab, total, clearCart } = useActiveTab();

  return useMutation({
    mutationFn: async (params: CheckoutParams) => {
      const isFx = params.type === "ExchangeCurrency";

      if (!params.customerId) {
        throw new ApiError("CUSTOMER_REQUIRED");
      }

      // Giao dịch vàng/bạc bắt buộc tham chiếu bảng giá đang áp dụng.
      // ExchangeCurrency không dùng bảng giá → bỏ qua.
      if (!isFx && !params.priceTableId) {
        throw new ApiError("PRICE_TABLE_NOT_FOUND");
      }

      if (!tab || (!isFx && tab.items.length === 0)) {
        throw new Error("Giỏ hàng trống");
      }

      const fxLines = tab.fxLines ?? [];
      if (isFx && (fxLines.length === 0 || fxLines.every((l) => l.fromAmount <= 0))) {
        throw new Error("Vui lòng nhập số tiền cần đổi");
      }
      // Snapshot active lines TRƯỚC khi API call — cart bị clearCart() sau onSuccess
      const activeFxLines = fxLines.filter((l) => l.fromAmount > 0);

      await strategy.prepare(total);

      const paymentMethod = isFx
        ? (tab.fxPaymentMethod ?? "CASH")
        : (params.paymentMethod ?? strategy.paymentMethod);

      const fxNote = isFx
        ? activeFxLines
            .map(
              (l) =>
                `${l.fromAmount.toLocaleString("en", { maximumFractionDigits: 2 })} ${l.fromCurrency} → ${l.toCurrency}`,
            )
            .join(", ") || undefined
        : params.note;

      // Tính cashAmount / bankAmount theo paymentMethod
      // CASH → cashAmount = total; BANK → bankAmount = total; COMBINED → dùng split từ params
      const cashAmount = isFx
        ? paymentMethod === "CASH" ? total : null
        : paymentMethod === "CASH"
          ? total
          : paymentMethod === "COMBINED"
            ? (params.cashAmount ?? null)
            : null;

      const bankAmount = isFx
        ? paymentMethod === "BANK" ? total : null
        : paymentMethod === "BANK"
          ? total
          : paymentMethod === "COMBINED"
            ? (params.bankAmount ?? null)
            : null;

      // create() → Completed ngay, trả về GUID
      const transactionId = await transactionRepository.create({
        type: params.type,
        customerId: params.customerId,
        priceTableId: isFx ? undefined : params.priceTableId,
        paymentMethod,
        cashAmount,
        bankAmount,
        note: fxNote,
        // Chế độ A — Multi-line FX (ưu tiên nếu có exchangeLines)
        exchangeLines: isFx
          ? activeFxLines.map((l) => ({
              fromCurrency: l.fromCurrency,
              fromAmount: l.fromAmount,
              fromRateToLak: l.fromRateToLak,
              toCurrency: l.toCurrency,
              toRateToLak: l.toRateToLak,
            }))
          : undefined,
        referenceInvoiceCode:
          params.referenceInvoiceCode ?? tab.linkedInvoiceCode ?? undefined,
        // FX: không có items vật lý — luôn gửi []
        items: isFx
          ? []
          : tab.items.map((item) => {
              const isExchangeIn = item.itemRole === "ExchangeIn";
              const hasLaoSut = item.perItemWearChi > 0;

              // Trọng lượng thực = tổng - hao hụt HAO HỤT (ExchangeIn & BuyGold/BuySilver)
              // Vàng nhập hao mòn theo Chỉ (×3.75g), bạc theo Gram (×1g)
              const wearUnitGram = item.wearUnitGram || 3.75;
              const totalGram =
                item.weightGramOverride ?? item.qty * item.weightGram;
              const effectiveWeightGram = hasLaoSut
                ? totalGram - item.perItemWearChi * wearUnitGram
                : totalGram;

              // Backend tự tính storedUnitPriceLak = (sentUnitPriceLak / gramPerUnit) × weightGramOverride
              // cho CẢ BuyGold lẫn ExchangeIn → luôn gửi giá gốc/đơn vị, KHÔNG pre-adjust ở frontend.
              const unitPriceLak = Math.round(item.unitPriceLakPerGram * item.weightGram);

              return {
                productId: item.productId,
                productName: item.name,
                quantity: item.qty,
                weightUnitId: item.weightUnitId ?? null,
                weightGramOverride: effectiveWeightGram,
                unitPriceLak,
                itemRole: item.itemRole,
                laborFee: isExchangeIn ? 0 : item.laborFee,
                stoneFee: isExchangeIn ? 0 : item.stoneFee,
                haoHutGram: item.perItemWearChi * wearUnitGram,
                phiHuHai: item.perItemDamage,
              };
            }),
      });

      // Fetch full transaction để hiển thị receipt
      const tx = await transactionRepository.getById(transactionId);

      // Backend không trả exchangeLines trong response → merge từ snapshot local
      // (activeFxLines được capture TRƯỚC khi clearCart() chạy ở onSuccess)
      if (isFx && activeFxLines.length > 0) {
        return {
          ...tx,
          exchangeLines: activeFxLines.map((l) => {
            const lakEq = Math.round(l.fromAmount * l.fromRateToLak);
            return {
              fromCurrency: l.fromCurrency,
              fromAmount: l.fromAmount,
              fromRateToLak: l.fromRateToLak,
              toCurrency: l.toCurrency,
              toRateToLak: l.toRateToLak,
              toAmount: l.toRateToLak > 0
                ? Math.round((lakEq / l.toRateToLak) * 10000) / 10000
                : 0,
            };
          }),
        };
      }
      return tx;
    },

    onSuccess: () => {
      clearCart();
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["products", "with-stock"] });
      toast.success(t("checkoutSuccess"));
    },

    onError: (err: unknown) => {
      const apiErr = err as ApiError;
      if (apiErr?.code) {
        toast.error(getErrorMessage(apiErr.code, locale));
      } else {
        toast.error(t("checkoutFailed"));
      }
    },
  });
}
