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
import { toast } from "sonner";
import { useActiveTab } from "./useActiveTab";

interface CheckoutParams {
  type: TransactionType;
  customerId: string; // bắt buộc — backend trả CUSTOMER_REQUIRED nếu thiếu
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
  const { tab, total, clearCart } = useActiveTab();

  return useMutation({
    mutationFn: async (params: CheckoutParams) => {
      const isFx = params.type === "ExchangeCurrency";

      if (!params.customerId) {
        throw new ApiError("CUSTOMER_REQUIRED");
      }

      if (!tab || (!isFx && tab.items.length === 0)) {
        throw new Error("Giỏ hàng trống");
      }

      if (isFx && (!tab.fxFromAmount || tab.fxFromAmount <= 0)) {
        throw new Error("Vui lòng nhập số tiền cần đổi");
      }

      await strategy.prepare(total);

      const paymentMethod = isFx
        ? "CASH"
        : (params.paymentMethod ?? strategy.paymentMethod);

      const fxNote = isFx
        ? `FX: ${tab.fxFromAmount.toLocaleString("en", { maximumFractionDigits: 4 })} ${tab.fxFromCurrency} → ${tab.fxToAmount.toLocaleString("en", { maximumFractionDigits: 4 })} ${tab.fxToCurrency}`
        : params.note;

      // Tính cashAmount / bankAmount theo paymentMethod
      // CASH → cashAmount = total; BANK → bankAmount = total; COMBINED → dùng split từ params
      const cashAmount = isFx
        ? null
        : paymentMethod === "CASH"
          ? total
          : paymentMethod === "COMBINED"
            ? (params.cashAmount ?? null)
            : null;

      const bankAmount = isFx
        ? null
        : paymentMethod === "BANK"
          ? total
          : paymentMethod === "COMBINED"
            ? (params.bankAmount ?? null)
            : null;

      // create() → Completed ngay, trả về GUID
      const transactionId = await transactionRepository.create({
        type: params.type,
        customerId: params.customerId,
        paymentMethod,
        cashAmount,
        bankAmount,
        note: fxNote,
        // FX fields — chỉ gửi khi ExchangeCurrency
        currency: isFx ? tab.fxFromCurrency : undefined,
        exchangeRate: isFx ? tab.fxFromRate : undefined,
        foreignAmount: isFx ? tab.fxFromAmount : undefined,
        targetCurrency: isFx ? tab.fxToCurrency : undefined,
        targetRateToLak:
          isFx && tab.fxToCurrency !== "LAK" ? tab.fxToRate : null,
        referenceInvoiceCode:
          params.referenceInvoiceCode ?? tab.linkedInvoiceCode ?? undefined,
        // FX: không có items vật lý — luôn gửi []
        items: isFx
          ? []
          : tab.items.map((item) => {
              const isExchangeIn = item.itemRole === "ExchangeIn";
              const hasLaoSut = item.perItemWearChi > 0;

              // Trọng lượng thực = tổng - hao hụt HAO HỤT (ExchangeIn & BuyGold)
              const totalGram =
                item.weightGramOverride ?? item.qty * item.weightGram;
              const effectiveWeightGram = hasLaoSut
                ? totalGram - item.perItemWearChi * 3.75
                : totalGram;

              // Backend tính lineTotal = qty × unitPriceLak − phiHuHai (không tự áp haoHutGram).
              // Với ExchangeIn có hao hụt: gửi giá đã điều chỉnh để backend ra đúng lineTotal.
              //   unitPriceLak_eff = effectiveWeightGram / qty × pricePerGram
              // Giá gốc (5.700.000/chỉ) vẫn được backend lưu vào tableUnitPriceLak để in phiếu.
              const unitPriceLak =
                isExchangeIn && hasLaoSut
                  ? Math.round(
                      (effectiveWeightGram / item.qty) * item.unitPriceLakPerGram,
                    )
                  : item.unitPriceLakPerGram * item.weightGram;

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
                haoHutGram: item.perItemWearChi * 3.75,
                phiHuHai: item.perItemDamage,
              };
            }),
      });

      // Fetch full transaction để hiển thị receipt
      return transactionRepository.getById(transactionId);
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
