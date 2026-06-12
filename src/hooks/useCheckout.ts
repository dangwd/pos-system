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

import type { ApiError } from "@/lib/api-error";
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
  customerId?: string;
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

      // FX: build 1 synthetic item — items thực tế không dùng
      const fxItems = isFx
        ? [
            {
              productId:
                process.env.NEXT_PUBLIC_FX_PRODUCT_ID ??
                "00000000-0000-0000-0000-000000000001",
              productName: `Ngoại tệ ${tab.fxFromAmount.toLocaleString()} ${tab.fxFromCurrency} → ${tab.fxToCurrency}`,
              quantity: 1,
              weightUnitId: null as string | null,
              weightGramOverride: tab.fxFromAmount,
              unitPriceLak: tab.fxLakAmount,
              itemRole: "Normal" as const,
              laborFee: 0,
              stoneFee: 0,
              haoHutGram: 0,
              phiHuHai: 0,
            },
          ]
        : null;

      const fxNote = isFx
        ? `FX: ${tab.fxFromAmount.toLocaleString()} ${tab.fxFromCurrency} → ${tab.fxToAmount.toLocaleString("en", { maximumFractionDigits: 4 })} ${tab.fxToCurrency}`
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
        currency:
          isFx && tab.fxFromCurrency !== "LAK" ? tab.fxFromCurrency : undefined,
        exchangeRate:
          isFx && tab.fxFromAmount > 0
            ? Math.round(tab.fxLakAmount / tab.fxFromAmount)
            : undefined,
        referenceInvoiceCode:
          params.referenceInvoiceCode ?? tab.linkedInvoiceCode ?? undefined,
        items:
          fxItems ??
          tab.items.map((item) => {
            const isExchangeIn = item.itemRole === "ExchangeIn";
            const hasPhiKho = isExchangeIn && item.perItemDamage > 0;
            const hasLaoSut = isExchangeIn && item.perItemWearChi > 0;

            // ExchangeIn: trọng lượng thực = tổng - hao hụt LAO SUT
            const effectiveWeightGram = isExchangeIn
              ? (item.weightGramOverride ?? item.qty * item.weightGram) -
                item.perItemWearChi * 3.75
              : item.weightGramOverride;

            // ExchangeIn: Tiền công/ LAO SUT encode vào productName để in phiếu
            const productName =
              isExchangeIn && (hasPhiKho || hasLaoSut)
                ? `${item.name} [PHÍ KHÒ: ${item.perItemDamage.toLocaleString("lo-LA")}₭ | LAO SUT: ${item.perItemWearChi} Chỉ]`
                : item.name;

            return {
              productId: item.productId,
              productName,
              quantity: item.qty,
              weightUnitId: item.weightUnitId ?? null,
              weightGramOverride: effectiveWeightGram,
              unitPriceLak: item.unitPriceLakPerGram * item.weightGram,
              itemRole: item.itemRole,
              laborFee: isExchangeIn ? 0 : item.laborFee,
              stoneFee: isExchangeIn ? 0 : item.stoneFee,
              haoHutGram: isExchangeIn ? item.perItemWearChi * 3.75 : 0,
              phiHuHai: isExchangeIn ? item.perItemDamage : 0,
            };
          }),
      });

      // Fetch full transaction để hiển thị receipt
      return transactionRepository.getById(transactionId);
    },

    onSuccess: () => {
      clearCart();
      qc.invalidateQueries({ queryKey: ["transactions"] });
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
